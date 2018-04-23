import * as vscode from 'vscode';
import Workspace from './workspace';
import * as forceCode from './../forceCode';
import { operatingSystem } from './../services';
import constants from './../models/constants';
import { configuration } from './../services';
import * as commands from './../commands';
import DXService, { SFDX } from './dxService';
const jsforce: any = require('jsforce');
const pjson: any = require('./../../../package.json');

export default class ForceService implements forceCode.IForceService {
    public dxCommands: any;
    public config: forceCode.Config;
    public conn: any;
    public containerId: string;
    public containerMembers: forceCode.IContainerMember[];
    public describe: forceCode.IMetadataDescribe;
    public apexMetadata: forceCode.IMetadataFileProperties[];
    public declarations: forceCode.IDeclarations;
    public codeCoverage: {} = {};
    public codeCoverageWarnings: forceCode.ICodeCoverageWarning[];
    public containerAsyncRequestId: string;
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
    private commandTimeout: any;

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
        configuration(this).then(config => {
            this.username = config.username || '';
            this.dxCommands.getOrgInfo().then(res => {
                if(res) {
                    this.connect();
                }
            });  
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

    public checkAndRunCommand(...theArgs): Promise<any> {
        if(this.commandTimeout) {
            clearTimeout(this.commandTimeout);
        }

        if(theArgs.length === 0 && this.commandQueue.length === 0) {
            return Promise.reject('Nothing to run');
        } else if(theArgs.length > 0) {
            this.commandQueue.push(theArgs);
        } 

        if(!this.isBusy && this.commandQueue.length > 0) {
            var cmd: Array<any> = this.commandQueue.shift();
            return Promise.resolve(this.runTheCommand(cmd));
        }
        
        // check every second and run when not busy
        this.commandTimeout = setTimeout(this.checkAndRunCommand(), 1000);
    }

    private async runTheCommand(cmd: Array<any>): Promise<any> {
        this.isBusy = true;
        var res: any;
        switch(cmd.length) {
            case 1:
                res = await cmd[0]();
                break;
            case 2:
                res = await cmd[0](cmd[1]);
                break;
            case 3:
                res = await cmd[0](cmd[1], cmd[2]);
                break;
            default:
                return Promise.reject('Not a valid command');
        }
        this.isBusy = false;
        return Promise.resolve(res);
    }

    public clearLog() {
        this.outputChannel.clear();
    }

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
        if (!self.config || !self.config.username || !self.dxCommands.isLoggedIn) {
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
        if (self.dxCommands.orgInfo === undefined || self.config.username !== self.username || self.conn === undefined) {
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
            return new Promise((resolve, reject) => {
                if(self.dxCommands.orgInfo) {
                    resolve(self.dxCommands.orgInfo);
                } else {
                    reject();
                }
            }).then(orgInf => {
                    vscode.window.forceCode.statusBarItem_UserInfo.text = `ForceCode: $(plug) Connecting as ${config.username}`;
                    // set the userId in connectionSuccess
                    self.conn = new jsforce.Connection({
                        instanceUrl : self.dxCommands.orgInfo.instanceUrl,
                        accessToken : self.dxCommands.orgInfo.accessToken,
                    });
                })
                .then(connectionSuccess)
                .catch(connectionError)
                .then(getNamespacePrefix)
                .then(refreshApexMetadata)
                .catch(err => self.outputError(err, vscode.window.forceCode.outputChannel));;

            function refreshApexMetadata(svc) {
                vscode.window.forceCode.refreshApexMetadata();
                return svc;
            }

            function connectionSuccess() {
                vscode.commands.executeCommand('setContext', 'ForceCodeActive', true);
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
                return self;
            }
            function getNamespacePrefix(svc: forceCode.IForceService) {
                return svc.dxCommands.soqlQuery('SELECT NamespacePrefix FROM Organization').then(res => {
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
