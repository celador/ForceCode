import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import { operatingSystem, configuration, commandService } from './../services';
import constants from './../models/constants';
import DXService from './dxService';
import * as path from 'path';
import * as creds from './../commands/credentials';
import * as fs from 'fs-extra';
const jsforce: any = require('jsforce');
const pjson: any = require('./../../../package.json');

export default class ForceService implements forceCode.IForceService {
    public dxCommands: any;
    public config: forceCode.Config;
    public conn: any;
    public containerId: string;
    public containerMembers: forceCode.IContainerMember[];
    public describe: forceCode.IMetadataDescribe;
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
    public workspaceMembers: {};//forceCode.IWorkspaceMember[];
    public statusInterval: any; 

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
        configuration(this).then(config => {
            this.username = config.username || '';
            commandService.runCommand('ForceCode.getOrgInfo', undefined).then(res => {
                if(res) {
                    commandService.runCommand('ForceCode.connect', undefined);
                }
            });  
        }).catch(() => {
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

    public newContainer(force: Boolean): Promise<forceCode.IForceService> {
        var self: forceCode.IForceService = vscode.window.forceCode;
        if ((self.containerId && !force) || (self.containerId && self.containerMembers.length === 0)) {
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

    public checkForFileChanges() {
        return this.getWorkspaceMembers()
            .then(this.parseMembers)
            .then(res => this.updateFileMetadata(res, true));
    }

    public updateFileMetadata(newMembers: forceCode.FCWorkspaceMembers, check?: boolean): Promise<any> {
        return this.checkAndSetWorkspaceMembers(newMembers, check);
    }

    // sometimes the times on the dates are a half second off, so this checks for within 2 seconds
    public compareDates(date1: string, date2: string): boolean {
        var date1MS: number = (new Date(date1.split('.')[0])).getTime();
        var date2MS: number = (new Date(date2.split('.')[0])).getTime();
        var difference = Math.abs(date1MS - date2MS);
        if(difference <= constants.MAX_TIME_BETWEEN_FILE_CHANGES) {
            return true;
        }
        
        console.log("Time difference between file changes: " + difference);
        return false;
    }

    private parseMembers(mems) {
        if(vscode.window.forceCode.dxCommands.isEmptyUndOrNull(mems[0])) {
            return undefined;
        }
        var types: {[key: string]: Array<any>} = {};
        types['type0'] = mems[1];
        if(types['type0'].length > 3) {
            for(var i = 1; types['type0'].length > 3; i++) {
                var newTypes: Array<any> = [];
                newTypes.push(types['type0'].shift());
                newTypes.push(types['type0'].shift());
                newTypes.push(types['type0'].shift());
                types['type' + i] = newTypes;
            }
        }
        let proms = Object.keys(types).map(curTypes => {
            return vscode.window.forceCode.conn.metadata.list(types[curTypes]);
        });
        return Promise.all(proms).then(rets => {
            const tempMems: forceCode.FCWorkspaceMembers = mems.shift();
            return parseRecords(tempMems, rets);
        });

        function parseRecords(members: forceCode.FCWorkspaceMembers, recs: any[]): forceCode.FCWorkspaceMembers {
            var membersToReturn: forceCode.FCWorkspaceMembers = {};
            //return Promise.all(recs).then(records => {
            console.log('Retrieved metadata records');
            recs.forEach(curSet => {
                curSet.forEach(key => {
                    if(members[key.fullName] && members[key.fullName].type === key.type) {
                        membersToReturn[key.id] = members[key.fullName];
                        membersToReturn[key.id].id = key.id;
                        membersToReturn[key.id].lastModifiedDate = key.lastModifiedDate;
                        membersToReturn[key.id].lastModifiedByName = key.lastModifiedByName; 
                    }
                });
            });
    
            return membersToReturn;
    
            //});
        }
    }

        // Get files in src folder..
    // Match them up with ContainerMembers
    private getWorkspaceMembers(): Promise<any> {
        return new Promise((resolve) => {
            var klaw: any = require('klaw');
            var members: forceCode.FCWorkspaceMembers = {}; 
            var types: Array<{}> = [];
            var typeNames: Array<string> = [];
            klaw(vscode.window.forceCode.workspaceRoot)
                .on('data', function (item) {
                    // Check to see if the file represents an actual member... 
                    if (item.stats.isFile()) {
                        //var metadataFileProperties: IMetadataFileProperties = getMembersFor(item);
                        
                        //if (metadataFileProperties) {
                        var type: string = undefined;
                        if (item.path.endsWith('.cls')) {
                            type = 'ApexClass';
                        } else if (item.path.endsWith('.trigger')) {
                            type = 'ApexTrigger';
                        } else if (item.path.endsWith('.component')) {
                            type = 'ApexComponent';
                        } else if (item.path.endsWith('.page')) {
                           type = 'ApexPage';
                        }

                        if(type) {
                            var pathParts: string[] = item.path.split(path.sep);
                            var filename: string = pathParts[pathParts.length - 1].split('.')[0];
                            if(!typeNames.includes(type)) {
                                typeNames.push(type);
                                types.push({type: type});
                            }

                            var workspaceMember: forceCode.IWorkspaceMember = {
                                name: filename,
                                path: item.path,
                                id: '',//metadataFileProperties.id,
                                lastModifiedDate: '',//metadataFileProperties.lastModifiedDate,
                                lastModifiedByName: '',
                                type: type,
                            };
                            members[filename] = workspaceMember;
                        }
                    }
                })
                .on('end', function () {
                    let retval: any[] = [members, types];
                    resolve(retval);
                });
        });
    }

    private checkAndSetWorkspaceMembers(newMembers: forceCode.FCWorkspaceMembers, check?: boolean){
        var self: forceCode.IForceService = vscode.window.forceCode;
        if(self.dxCommands.isEmptyUndOrNull(newMembers)) {
            return undefined;
        }

        if(check) {
            if(!self.dxCommands.isEmptyUndOrNull(self.workspaceMembers)) {
                const changedMems = Object.keys(newMembers).filter(key=> {
                    return (self.workspaceMembers[key] && !self.compareDates(self.workspaceMembers[key].lastModifiedDate, newMembers[key].lastModifiedDate));
                });
                console.log('Done checking members');
                if(changedMems && changedMems.length > 0) {
                    console.log(changedMems.length + ' members were changed since last load');
                    changedMems.forEach(curMem => {
                        commandService.runCommand('ForceCode.fileModified', vscode.window.forceCode.workspaceMembers[curMem].path, newMembers[curMem].lastModifiedByName);
                    });
                    // return here so we're not left with stale metadata
                    return undefined;
                }
            } 
            self.workspaceMembers = newMembers;
            console.log('Done getting workspace info');
        }
           
        return self.dxCommands.saveToFile(JSON.stringify(newMembers), 'wsMembers.json').then(() => {
            console.log('Updated workspace file');
            return undefined;
        });
    }

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
            }).then(() => {
                    vscode.window.forceCode.statusBarItem_UserInfo.text = `ForceCode: $(plug) Connecting as ${config.username}`;
                    // get the refresh token
                    var refreshToken =  fs.readJsonSync(operatingSystem.getHomeDir() + path.sep + '.sfdx' + path.sep + self.dxCommands.orgInfo.username + '.json').refreshToken;
                    // set the userId in connectionSuccess
                    self.conn = new jsforce.Connection({
                        oauth2: {
                            clientId: self.dxCommands.orgInfo.clientId,
                        },
                        instanceUrl : self.dxCommands.orgInfo.instanceUrl,
                        accessToken : self.dxCommands.orgInfo.accessToken,
                        refreshToken: refreshToken,
                        version: vscode.window.forceCode.config.apiVersion || constants.API_VERSION,
                    });
                })
                .then(connectionSuccess)
                .catch(connectionError)
                .then(getNamespacePrefix)
                .then(checkForChanges)
                .then(cleanupContainers)
                .catch(err => vscode.window.showErrorMessage(err.message));

                // we get a nice chunk of forcecode containers after using for some time, so let's clean them on startup
            function cleanupContainers(): Promise<any> {
                return new Promise(function (resolve) {
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

            function checkForChanges(svc) {
                commandService.runCommand('ForceCode.checkForFileChanges', undefined, undefined);
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
                vscode.window.showErrorMessage(`ForceCode: Connection Error`);
                throw err;
            }
        } else {
            // self.outputChannel.appendLine(`Connected as ` + self.config.username);
            // vscode.window.forceCode.statusBarItem.text = `ForceCode: $(history) ${self.config.username}`;
            return Promise.resolve(self);
        }
    }
}
