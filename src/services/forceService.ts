import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import { operatingSystem, configuration, commandService, codeCovViewService, switchUserViewService } from './../services';
import constants from './../models/constants';
import DXService from './dxService';
import * as path from 'path';
import * as creds from './../commands/credentials';
import { FCFile } from './codeCovView';
import { getToolingTypeFromExt } from '../parsers/getToolingType';
const jsforce: any = require('jsforce');

export default class ForceService implements forceCode.IForceService {
    public fcDiagnosticCollection: vscode.DiagnosticCollection;
    public dxCommands: any;
    public config: forceCode.Config;
    public conn: any;
    public containerId: string;
    public containerMembers: forceCode.IContainerMember[];
    public describe: forceCode.IMetadataDescribe;
    public declarations: forceCode.IDeclarations;
    public containerAsyncRequestId: string;
    public statusBarItem: vscode.StatusBarItem;
    public outputChannel: vscode.OutputChannel;
    public operatingSystem: string;
    public workspaceRoot: string;
    public statusTimeout: any; 

    constructor() {
        this.dxCommands = new DXService();
        this.fcDiagnosticCollection = vscode.languages.createDiagnosticCollection('fcDiagCol');
        // Set the ForceCode configuration
        this.operatingSystem = operatingSystem.getOS();
        // Setup username and outputChannel
        this.outputChannel = vscode.window.createOutputChannel(constants.OUTPUT_CHANNEL_NAME);
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 6);
        this.statusBarItem.command = 'ForceCode.showMenu';
        this.statusBarItem.tooltip = 'Open the ForceCode Menu';
        this.containerMembers = [];
        configuration(this).then(config => {
            commandService.runCommand('ForceCode.switchUserText', { username: config.username, loginUrl: config.url}, true);
        });
    }
    public connect(): Promise<forceCode.IForceService> {
        return this.setupConfig().then(this.login);
    }

    public clearLog() {
        this.outputChannel.clear();
    }

    public showStatus(message: string) {
        vscode.window.forceCode.statusBarItem.text = message;
        this.resetStatus();
    }

    public resetStatus() {
        // for status bar updates. resets after 5 seconds
        clearTimeout(vscode.window.forceCode.statusTimeout);
        vscode.window.forceCode.statusTimeout = setTimeout(function () {
            vscode.window.forceCode.statusBarItem.text = `ForceCode Menu`;
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
        return vscode.window.forceCode.conn.metadata.describe().then(res => {
            vscode.window.forceCode.describe = res;
            return this.getWorkspaceMembers()
                .then(this.parseMembers);
        });
    }

    private parseMembers(mems) {
        if(vscode.window.forceCode.dxCommands.isEmptyUndOrNull(mems)) {
            return Promise.resolve({});
        }
        var types: {[key: string]: Array<any>} = {};
        types['type0'] = mems;
        if(types['type0'].length > 3) {
            for(var i = 1; types['type0'].length > 3; i++) {
                types['type' + i] = types['type0'].splice(0, 3);
            }
        }
        let proms = Object.keys(types).map(curTypes => {
            return vscode.window.forceCode.conn.metadata.list(types[curTypes]);
        });
        return Promise.all(proms).then(rets => {
            return parseRecords(rets);
        });

        function parseRecords(recs: any[]): Promise<any> {
            if(!Array.isArray(recs)) {
                Promise.resolve();
            }
            //return Promise.all(recs).then(records => {
            console.log('Done retrieving metadata records');
            recs.forEach(curSet => {
                if(Array.isArray(curSet)) {
                    curSet.forEach(key => {
                        var curFCFile: FCFile = codeCovViewService.findByNameAndType(key.fullName, key.type);
                        if(curFCFile) {
                            var curMem: forceCode.IWorkspaceMember = curFCFile.getWsMember();
                            if(curFCFile.compareDates(key.lastModifiedDate) || !vscode.window.forceCode.config.checkForFileChanges || curMem.type === 'AuraDefinitionBundle') {
                                curMem.id = key.id;
                                curMem.lastModifiedByName = key.lastModifiedByName; 
                                curMem.lastModifiedById = key.lastModifiedById;
                                curFCFile.updateWsMember(curMem);
                            } else {
                                commandService.runCommand('ForceCode.fileModified', curMem.path, key.lastModifiedByName);
                            }
                        }
                    });
                }
            });
            console.log('Done getting workspace info');
            return commandService.runCommand('ForceCode.getCodeCoverage', undefined, undefined).then(() => {
                console.log('Done retrieving code coverage');
                return Promise.resolve();
            });
        }
    }

        // Get files in src folder..
    // Match them up with ContainerMembers
    private getWorkspaceMembers(): Promise<any> {
        return new Promise((resolve) => {
            var klaw: any = require('klaw');
            var types: Array<{}> = [];
            var typeNames: Array<string> = [];
            klaw(vscode.window.forceCode.workspaceRoot)
                .on('data', function (item) {
                    // Check to see if the file represents an actual member... 
                    if (item.stats.isFile()) {                        
                        var type: string = getToolingTypeFromExt(item.path);

                        if(type) {
                            var pathParts: string[] = item.path.split(path.sep);
                            var filename: string = pathParts[pathParts.length - 1].split('.')[0];
                            if(!typeNames.includes(type)) {
                                typeNames.push(type);
                                types.push({type: type});
                            }

                            if(!codeCovViewService.findByPath(item.path)) {
                                var workspaceMember: forceCode.IWorkspaceMember = {
                                    name: filename,
                                    path: item.path,
                                    id: '',//metadataFileProperties.id,
                                    lastModifiedDate: item.stats.mtime,
                                    lastModifiedByName: '',
                                    lastModifiedById: '',
                                    type: type,
                                };
                                codeCovViewService.addClass(workspaceMember, false);
                            }
                        }
                    }
                })
                .on('end', function () {
                    resolve(types);
                });
        });
    }

    private setupConfig(): Promise<forceCode.Config> {
        var self: forceCode.IForceService = vscode.window.forceCode;
        // Setup username and outputChannel
        var uname: string = switchUserViewService.orgInfo.username;
        switchUserViewService.orgInfo.username = uname ? uname : (self.config && self.config.username) || '';
        if (!switchUserViewService.isLoggedIn()) {
            return creds.default(true).then(credentials => {
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
        if (self.conn === undefined) {
            if (!config.username) {
                throw { message: '$(alert) Missing Credentials $(alert)' };
            }
            // get sfdx login info and use oath2
            
            
            // get the current org info
            return new Promise((resolve, reject) => {
                if(switchUserViewService.isLoggedIn()) {
                    resolve();
                } else {
                    reject();
                }
            }).then(() => {
                    self.conn = new jsforce.Connection({
                        oauth2: {
                            clientId: switchUserViewService.orgInfo.clientId
                        },
                        instanceUrl : switchUserViewService.orgInfo.instanceUrl,
                        accessToken : switchUserViewService.orgInfo.accessToken,
                        refreshToken: switchUserViewService.orgInfo.refreshToken,
                        version: vscode.window.forceCode.config.apiVersion || constants.API_VERSION,
                    });

                    // query the userid
                    return self.conn.tooling.sobject('User')
                        .find({UserName: switchUserViewService.orgInfo.username})
                        .execute(function(err, result) {
                            if(err) { return Promise.reject(err) }
                            switchUserViewService.orgInfo.userId = result[0].Id;
                            return self
                        });
                })
                .then(connectionSuccess)
                .then(getNamespacePrefix)
                .then(checkForChanges)
                .then(cleanupContainers)
                .catch(connectionError);

                // we get a nice chunk of forcecode containers after using for some time, so let's clean them on startup
            function cleanupContainers(): Promise<any> {
                return new Promise(function (resolve) {
                    vscode.window.forceCode.conn.tooling.sobject('MetadataContainer')
                        .find({ Name: {$like : 'ForceCode-%'}})
                        .execute(function(err, records) {
                            var toDelete: string[] = new Array<string>();
                            if(!records) {
                                resolve();
                            }
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
                self.statusBarItem.show();

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
            return Promise.resolve(self);
        }
    }
}
