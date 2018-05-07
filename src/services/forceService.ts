import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import { operatingSystem, configuration, commandViewService } from './../services';
import constants from './../models/constants';
import * as commands from '../models/commands';
import DXService, { SFDX } from './dxService';
import * as path from 'path';
import * as creds from './../commands/credentials';
import { diff, retrieve } from './../commands';
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
    public statusInterval: any; 
    private commandTimeout: any;

    constructor() {
        this.dxCommands = new DXService();
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

    public clearLog() {
        this.outputChannel.clear();
    }

    public showStatus(message: string) {
        vscode.window.forceCode.statusBarItem_UserInfo.text = message;
        this.resetStatus();
    }

    public resetStatus() {
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
    }

    public runCommand(command: string, context: any, selectedResource?: any) {
        // add something to keep track of the running command in here
        var theCommand = commands.default.find(cur => { return cur.commandName === command; });
        
        if(theCommand.commandName === 'ForceCode.compile') {
            var fileName;
            var splitPath;
            if(selectedResource && selectedResource.path) {
                splitPath = selectedResource.fsPath.split(path.sep); 
            } else {
                splitPath = vscode.window.activeTextEditor.document.fileName.split(path.sep);
            }
            theCommand.name = 'Saving ' + splitPath[splitPath.length - 1].split('.')[0];
        }
        
        return commandViewService.addCommandExecution(theCommand, context);
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
                    return Promise.resolve(self);
                });
        }
    }

        // Get files in src folder..
    // Match them up with ContainerMembers
    public getWorkspaceMembers(metadata?): Promise<forceCode.IWorkspaceMember[]> {
        return new Promise((resolve, reject) => {
            var klaw: any = require('klaw');
            var members: forceCode.IWorkspaceMember[] = []; // files, directories, symlinks, etc
            klaw(vscode.window.forceCode.workspaceRoot)
                .on('data', function (item) {
                    // Check to see if the file represents an actual member... 
                    if (item.stats.isFile()) {
                        var metadataFileProperties: forceCode.IMetadataFileProperties[] = getMembersFor(item);
                        
                        if (metadataFileProperties.length) {

                            var workspaceMember: forceCode.IWorkspaceMember = {
                                name: metadataFileProperties[0].fullName,
                                path: item.path,
                                memberInfo: metadataFileProperties[0],
                            };
                            members.push(workspaceMember);
                        }
                    }
                })
                .on('end', function () {
                    resolve(members);
                    // console.dir(items) // => [ ... array of files]
                });
        });

        function getMembersFor(item): forceCode.IMetadataFileProperties[] {
            var pathParts: string[] = item.path.split(path.sep);
            var filename: string = pathParts[pathParts.length - 1];

            return vscode.window.forceCode.apexMetadata.filter(member => {
                return member.fileName.split('/')[1] === filename;
            });
        }

    }

    // we get a nice chunk of forcecode containers after using for some time, so let's clean them on startup
    public cleanupContainers(): Promise<any> {
        return new Promise(function (resolve, reject) {
            vscode.window.forceCode.conn.tooling.sobject('MetadataContainer')
                .find({ Name: {$like : 'ForceCode-%'}})
                .execute(function(err, records) {
                    var toDelete: string[] = new Array<string>();
                    records.forEach(r => {
                        toDelete.push(r.Id);
                    })
                    if(toDelete.length > 0) {
                        resolve(vscode.window.forceCode.conn.tooling.sobject('MetadataContainer')
                            .del(toDelete));
                    } else {
                        resolve();
                    }
                });     
        });          
    }

    public refreshApexMetadata() {
        var self: forceCode.IForceService = vscode.window.forceCode;
        return self.conn.metadata.describe().then(describe => {
            self.describe = describe;
            var apexTypes: string[] = describe.metadataObjects
                .filter(o => o.xmlName.startsWith('ApexClass') || o.xmlName.startsWith('ApexTrigger'))
                .map(o => {
                    return {
                        type: o.xmlName,
                        folder: o.directoryName,
                    };
                });
            return self.conn.metadata.list(apexTypes).then(res => {
                self.apexMetadata = res;
                return self.getWorkspaceMembers().then(members => {
                    return self.checkAndSetWorkspaceMembers(members).then(cMems => {
                        return self.showDiffWSMembers(cMems);
                    });
                });
            });
        });
    }

    public checkAndSetWorkspaceMembers(newMembers: forceCode.IWorkspaceMember[]): any {
        var self: forceCode.IForceService = vscode.window.forceCode;
           
        return self.dxCommands.saveToFile(JSON.stringify(newMembers), 'wsMembers.json').then(res => {
            if(self.workspaceMembers) {
                const tempMems = self.workspaceMembers;
                const changedMems = getChangedMems(tempMems);
                console.log('Done getting workspace info - updated file');
                console.log(changedMems);
                self.workspaceMembers = newMembers;
                if(changedMems && changedMems.length > 0) {
                    console.log(changedMems.length + ' members were changed since last load');
                    return changedMems;
                }
            } else {
                self.workspaceMembers = newMembers;
                console.log('Done getting workspace info - new file');
            }
            return;
        });

        function getChangedMems(mems: forceCode.IWorkspaceMember[]) {
            return newMembers.filter(curMem => {
                return (curMem.memberInfo.lastModifiedById !== mems.find(f => { return f.memberInfo.id === curMem.memberInfo.id; }).memberInfo.lastModifiedById);
            });
        }
    }

    public showDiffWSMembers(changedMembers: forceCode.IWorkspaceMember[]) {
        if(!changedMembers || changedMembers.length === 0) {
            return;
        }
        console.log('Showing changed files');
        changedMembers.forEach(curMem => {
            showChange(curMem);
        });

        return;

        function showChange(mem: forceCode.IWorkspaceMember) {
            const theDoc = vscode.workspace.textDocuments.find(td => { console.log(td);return td.fileName === mem.path; });
            vscode.window.showWarningMessage('Someone else has changed ' + mem.name, 'Refresh', 'Diff', 'Dismiss').then(s => {
                if (s === 'Refresh') {
                    retrieve(undefined, theDoc.uri);
                } else if(s === 'Diff') {
                    diff(theDoc, undefined);
                }
            });
        }
    }

    // TODO: Add keychain access so we don't have to use a username or password'
    // var keychain = require('keytar')
    private setupConfig(): Promise<forceCode.Config> {
        var self: forceCode.IForceService = vscode.window.forceCode;
        // Setup username and outputChannel
        self.username = (self.config && self.config.username) || '';
        if (!self.config || !self.config.username || !self.dxCommands.isLoggedIn) {
            return creds.default().then(credentials => {
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
                .then(cleanupContainers)
                .catch(err => vscode.window.showErrorMessage(err.message));

            function refreshApexMetadata(svc) {
                vscode.window.forceCode.refreshApexMetadata();
                return svc;
            }

            function cleanupContainers(svc) {
                vscode.window.forceCode.cleanupContainers();
                return svc;
            }

            function connectionSuccess() {
                vscode.commands.executeCommand('setContext', 'ForceCodeActive', true);
                vscode.window.forceCode.statusBarItem.text = `ForceCode Menu`;
                vscode.window.forceCode.statusBarItem_UserInfo.text = 'ForceCode ' + pjson.version + ' connected as ' + vscode.window.forceCode.config.username;
                
                vscode.window.forceCode.resetStatus();
                self.statusBarItem_UserInfo.show();
                self.statusBarItem.show();

                self.username = config.username;
                // query the userid
                return self;
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
                vscode.window.showErrorMessage(`ForceCode: $(alert) Connection Error $(alert)`);
                throw err;
            }
        } else {
            // self.outputChannel.appendLine(`Connected as ` + self.config.username);
            // vscode.window.forceCode.statusBarItem.text = `ForceCode: $(history) ${self.config.username}`;
            return Promise.resolve(self);
        }
    }
}
