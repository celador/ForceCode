import * as vscode from 'vscode';
import Workspace from './workspace';
import * as forceCode from './../forceCode';
import { operatingSystem } from './../services';
import constants from './../models/constants';
import { configuration } from './../services';
import * as commands from './../commands';
import jsf = require('jsforce');
import DXService from './dxService';
const jsforce: any = require('jsforce');
const pjson: any = require('./../../../package.json');

export default class ForceService implements forceCode.IForceService {
    public dxCommands: any;
    public config: forceCode.Config;
    public conn: any;
    public containerId: string;
    public containerMembers: forceCode.IContainerMember[];
    public describe: forceCode.IMetadataDescribe;
    public apexMetadata: jsf.IMetadataFileProperties[];
    public declarations: forceCode.IDeclarations;
    public codeCoverage: {} = {};
    public codeCoverageWarnings: forceCode.ICodeCoverageWarning[];
    public containerAsyncRequestId: string;
    public userInfo: any;
    public username: string;
    public statusBarItem_UserInfo: vscode.StatusBarItem;
    public statusBarItem: vscode.StatusBarItem;
    public outputChannel: vscode.OutputChannel;
    public operatingSystem: string;
    public workspaceRoot: string;
    public workspaceMembers: forceCode.IWorkspaceMember[];
    public commandQueue: any[];
    public isBusy: boolean;
    public testTimeout: number;
    public statusInterval: any; 

    constructor() {
        this.commandQueue = new Array();
        this.dxCommands = new DXService();
        this.isBusy = false;
        // Set the ForceCode configuration
        this.operatingSystem = operatingSystem.getOS();
        // Setup username and outputChannel
        this.outputChannel = vscode.window.createOutputChannel(constants.OUTPUT_CHANNEL_NAME);
        //this.outputChannel.show();
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 5);
        this.statusBarItem_UserInfo = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 5);
        this.statusBarItem.command = 'ForceCode.showMenu';
        this.statusBarItem.tooltip = 'Open the ForceCode Menu';
        //this.statusBarItem.text = 'ForceCode: Active';
        this.containerMembers = [];
        this.apexMetadata = [];
        this.declarations = {};
        configuration(this).then(config => {
            this.username = config.username || '';

            if(this.dxCommands.getOrgInfo() !== undefined) {
                this.connect();
                }
        }).catch(err => {
            this.statusBarItem.text = 'ForceCode: Missing Configuration';
        });
    }
    public connect(): Promise<forceCode.IForceService> {
        return this.setupConfig().then(this.login);
    }

    public resetMenu() {
        setTimeout(function() {
            vscode.window.forceCode.statusBarItem.color = 'white';
            vscode.window.forceCode.statusBarItem.text = 'ForceCode Menu';
        }, 5000);
    }

    public clearLog() {
        this.outputChannel.clear();
    };

    public newContainer(force: Boolean): Promise<forceCode.IForceService> {
        var self: forceCode.IForceService = vscode.window.forceCode;
        if (self.containerId && !force) {
            return Promise.resolve(self);
        } else {
            return self.conn.tooling.sobject('MetadataContainer')
                .create({ name: 'ForceCode-' + Date.now() })
                .then(res => {
                    self.containerId = res.id;
                    self.containerMembers = [];
                    return self;
                });
        }
    }

    public refreshApexMetadata() {
        return vscode.window.forceCode.conn.metadata.describe().then(describe => {
            vscode.window.forceCode.describe = describe;
            var apexTypes: string[] = describe.metadataObjects
                .filter(o => o.xmlName.startsWith('ApexClass') || o.xmlName.startsWith('ApexTrigger'))
                .map(o => {
                    return {
                        type: o.xmlName,
                        folder: o.directoryName,
                    };
                });

            return vscode.window.forceCode.conn.metadata.list(apexTypes).then(res => {
                vscode.window.forceCode.apexMetadata = res;
                return res;
            }).then(new Workspace().getWorkspaceMembers).then(members => {
                this.workspaceMembers = members;
            });
        });
    }

    public outputError(error: forceCode.ForceCodeError, outputChannel: vscode.OutputChannel) {
        this.statusBarItem.text = 'ForceCode: ' + error.message;
        this.resetMenu();
        outputChannel.appendLine('================================     ERROR     ================================\n');
        outputChannel.appendLine(error.message);
        console.error(error);
        return false;
    };

    // TODO: Add keychain access so we don't have to use a username or password'
    // var keychain = require('keytar')
    private setupConfig(): Promise<forceCode.Config> {
        var self: forceCode.IForceService = vscode.window.forceCode;
        // Setup username and outputChannel
        self.username = (self.config && self.config.username) || '';
        if (!self.config || !self.config.username || self.dxCommands.getOrgInfo() === undefined) {
            return commands.credentials().then(credentials => {
                self.config.username = credentials.username;
                self.config.autoCompile = credentials.autoCompile;
                self.config.url = credentials.url;
                return self.config;
            });
        }
        return configuration();
    }
    private login(config): Promise<forceCode.IForceService> {
        var self: forceCode.IForceService = vscode.window.forceCode;
        // Lazy-load the connection
        if (self.userInfo === undefined || self.config.username !== self.username || self.conn === undefined) {
            var connectionOptions: any = {
                loginUrl: self.config.url || 'https://login.salesforce.com'
            };
            if (self.config.proxyUrl) {
                connectionOptions.proxyUrl = self.config.proxyUrl;
            }
            if (!config.username) {
                vscode.window.forceCode.outputChannel.appendLine('The force.json file seems to not have a username. Pease insure you have a properly formatted config file, or submit an issue to the repo @ https"//github.com/celador/forcecode/issues ');
                throw { message: '$(alert) Missing Credentials $(alert)' };
            }
            // get sfdx login info and use oath2
            
            
            // get the current org info
            return self.dxCommands.getOrgInfo()
                .then(orgInf => {
                    vscode.window.forceCode.statusBarItem_UserInfo.text = `ForceCode: $(plug) Connecting as ${config.username}`;
                    // set the userId in connectionSuccess
                    self.userInfo = {
                        id: null,
                        organizationId: orgInf.id,
                        url: orgInf.instanceUrl
                    };
                    self.conn = new jsforce.Connection({
                        instanceUrl : orgInf.instanceUrl,
                        accessToken : orgInf.accessToken,
                    });
                })
                .then(connectionSuccess)
                .catch(connectionError)
                .then(getNamespacePrefix)
                .then(refreshApexMetadata)
                .then(getPublicDeclarations)
                .then(getPrivateDeclarations)
                .then(getManagedDeclarations)
                .catch(err => self.outputError(err, vscode.window.forceCode.outputChannel));;

            function refreshApexMetadata(svc) {
                vscode.window.forceCode.refreshApexMetadata();
                return svc;
            }

            function getPublicDeclarations(svc) {
                var requestUrl: string = svc.conn.instanceUrl + '/services/data/v42.0/tooling/completions?type=apex';
                var headers: any = {
                    'Accept': 'application/json',
                    'Authorization': 'OAuth ' + svc.conn.accessToken,
                };
                require('node-fetch')(requestUrl, { method: 'GET', headers }).then(response => response.json()).then(json => {
                    svc.declarations.public = json.publicDeclarations;
                });
                return svc;
            }

            function getPrivateDeclarations(svc) {
                var query: string = 'SELECT Id, ApiVersion, Name, NamespacePrefix, SymbolTable, LastModifiedDate FROM ApexClass WHERE NamespacePrefix = \'' + self.config.prefix + '\'';
                self.declarations.private = [];
                self.conn.tooling.query(query)
                    .then(res => accumulateAllRecords(res, self.declarations.private));
                return svc;
            }
            function getManagedDeclarations(svc) {
                var query: string = 'SELECT Id, Name, NamespacePrefix, SymbolTable, LastModifiedDate FROM ApexClass WHERE NamespacePrefix != \'' + self.config.prefix + '\'';
                self.declarations.managed = [];
                self.conn.tooling.query(query)
                    .then(res => accumulateAllRecords(res, self.declarations.managed));
                return svc;
            }
            function accumulateAllRecords(result, accumulator) {
                if (result && result.done !== undefined && Array.isArray(result.records)) {
                    if (result.done) {
                        result.records.forEach(record => {
                            accumulator.push(record);
                        });
                        return result;
                    } else {
                        result.records.forEach(record => {
                            accumulator.push(record);
                        });
                        return self.conn.tooling.queryMore(result.nextRecordsUrl).then(res => accumulateAllRecords(res, accumulator));
                    }
                }
            }
            function connectionSuccess() {
                vscode.window.forceCode.statusBarItem.text = `ForceCode Menu`;
                vscode.window.forceCode.statusBarItem_UserInfo.text = 'ForceCode ' + pjson.version + ' connected as ' + vscode.window.forceCode.config.username;
                
                // for status bar updates. update every 5 seconds
                clearInterval(vscode.window.forceCode.statusInterval);
                vscode.window.forceCode.statusInterval = setInterval(function () {
                    var lim = '';
                    if (vscode.window.forceCode.conn && vscode.window.forceCode.conn.limitInfo && vscode.window.forceCode.conn.limitInfo.apiUsage) {
                        lim = ' - Limits: ' + vscode.window.forceCode.conn.limitInfo.apiUsage.used + '/' + vscode.window.forceCode.conn.limitInfo.apiUsage.limit;
                    }
                    if(vscode.window.forceCode.config.username) {
                        vscode.window.forceCode.statusBarItem_UserInfo.text = 'ForceCode ' + pjson.version + ' connected as ' + vscode.window.forceCode.config.username + lim;
                    } else {
                        vscode.window.forceCode.statusBarItem_UserInfo.text = '$(alert) ForceCode not connected $(alert)';
                    }
                }, 5000);
                self.statusBarItem_UserInfo.show();
                self.statusBarItem.show();
                self.resetMenu();

                self.outputChannel.appendLine(`Connected as ` + self.config.username);
                self.username = config.username;
                // query the userid
                return self.dxCommands.soqlQuery("SELECT Id FROM User WHERE UserName='" + self.config.username + "'")
                        .then(res => {
                            self.userInfo.id = res.records[0].Id;
                            return self;
                        });
            }
            function getNamespacePrefix(svc: forceCode.IForceService) {
                return svc.conn.query('SELECT NamespacePrefix FROM Organization').then(res => {
                    if (res && res.records.length && res.records[0].NamespacePrefix) {
                        svc.config.prefix = res.records[0].NamespacePrefix;
                    }
                    return svc;
                });
            }
            function connectionError(err) {
                vscode.window.forceCode.statusBarItem.text = `ForceCode: $(alert) Connection Error $(alert)`;
                self.outputChannel.appendLine('================================================================');
                self.outputChannel.appendLine(err.message);
                throw err;
            }
        } else {
            // self.outputChannel.appendLine(`Connected as ` + self.config.username);
            // vscode.window.forceCode.statusBarItem.text = `ForceCode: $(history) ${self.config.username}`;
            return Promise.resolve(self);
        }
    }
}
