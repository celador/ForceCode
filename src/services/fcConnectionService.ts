import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { dxService, FCOauth, FCConnection, operatingSystem } from '.';
import constants from '../models/constants';
const jsforce: any = require('jsforce');
import klaw = require('klaw');
import { Config } from '../forceCode';
import { saveConfigFile, readConfigFile } from './configuration';
import { checkConfig, enterCredentials } from './credentials';

export const REFRESH_EVENT_NAME: string = 'refreshConns';

export class FCConnectionService implements vscode.TreeDataProvider<FCConnection> {
    private static instance: FCConnectionService;
    private _onDidChangeTreeData: vscode.EventEmitter<FCConnection | undefined>
        = new vscode.EventEmitter<FCConnection | undefined>();
    private loggingIn: boolean = false;
    private refreshingConns: boolean = false;

    public readonly onDidChangeTreeData: vscode.Event<FCConnection | undefined> =
        this._onDidChangeTreeData.event;
    public currentConnection: FCConnection;
    public connections: FCConnection[];

    public constructor() {
        console.log('Starting connection service...');
        this.connections = [];
    }

    public static getInstance() {
        if (!FCConnectionService.instance) {
            FCConnectionService.instance = new FCConnectionService();
        }
        return FCConnectionService.instance;
    }

    public getTreeItem(element: FCConnection): vscode.TreeItem {
        return element;
    }

    public getChildren(element?: FCConnection): FCConnection[] {
        if (!element) {
            // This is the root node
            return this.connections;
        }

        return [];
    }

    public getParent(element: FCConnection): any {
        return null;    // this is the parent
    }

    public refreshView() {
        this._onDidChangeTreeData.fire();
    }

    public refreshConnsStatus() {
        this.connections.forEach(conn => {
            conn.showConnection();
        });
        this.connections.sort(this.sortFunc);
    }

    public isLoggedIn(): boolean {
        const loggedIn: boolean = this.currentConnection && this.currentConnection.connection 
            && vscode.window.forceCode.conn && this.currentConnection.isLoggedIn;
        if (loggedIn) {
            vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', true);
        } else {
            vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', false);
        }
        return loggedIn;
    }

    public getSavedUsernames(): Promise<string[]> {
        return new Promise((resolve) => {
            var usernames: string[] = [];
            var fcPath: string = path.join(vscode.window.forceCode.workspaceRoot, '.forceCode');
            if(fs.existsSync(fcPath)) {
                klaw(fcPath, { depthLimit: 1 })
                    .on('data', function (file) {
                        if (file.stats.isDirectory()) {
                            var fileName: string = file.path.split(path.sep).pop();
                            if (fileName.indexOf('@') > 0) {
                                usernames.push(fileName);
                            }
                        }
                    })
                    .on('end', function () {
                        resolve(usernames);
                    });
            } else {
                resolve(usernames);
            }
        });
    }

    public refreshConnections(): Promise<boolean> {
        if(!this.refreshingConns) {
            this.refreshingConns = true;
            return dxService.orgList()
                .then(orgs => {
                    return this.getSavedUsernames().then(uNames => {
                        uNames.forEach(uName => {
                            this.addConnection({ username: uName });
                        });
                        if(orgs) {
                            orgs.orgs.forEach(curOrg => {
                                if(!curOrg.isExpired && (curOrg.connectedStatus === 'Connected' 
                                        || curOrg.connectedStatus === 'Unknown')) {
                                    this.addConnection(curOrg);
                                }
                            });
                        }
                        // tell the connections to refresh their text/icons
                        this.refreshConnsStatus();
                        console.log('Orgs refreshed');
                        this.refreshingConns = false;
                        return true;
                    });
                });
        } else {
            return Promise.resolve(true);
        }
    }

    // this is a check that will refresh the orgs and check if logged in. if not, it asks to log in
    public checkLoginStatus(reason: any): Promise<boolean> {
        const message = reason && reason.message ? reason.message : reason;
        return this.refreshConnections().then(() => {
            if (!this.isLoggedIn() || (message && message.indexOf('expired access/refresh token') !== -1)) {
                if(this.currentConnection) {
                    this.currentConnection.isLoggedIn = false;
                }
                return this.connect(this.currentConnection ? this.currentConnection.orgInfo : undefined);
            } else {
                return true;
            }
        });
    }

    public connect(orgInfo: FCOauth): Promise<boolean> {
        if(!this.loggingIn) {
            this.loggingIn = true;
            if(!orgInfo) {
                orgInfo = {username: undefined, loginUrl: undefined}
            }
            return this.setupConn(this, orgInfo.username)
                .then(res => {
                    return this.login(this, res).then(loginRes => {
                        return vscode.window.forceCode.connect().then(() => {
                            return loginRes;
                        });
                    });
                })
                .catch(() => { return false; })
                .then(finalRes => {
                    this.loggingIn = false;
                    return finalRes;
                });
        } else {
            return Promise.resolve(false);
        }
    }

    private setupConn(service: FCConnectionService, username: string): Promise<boolean> {
        service.currentConnection = service.getConnByUsername(username);
        if (!service.isLoggedIn()) {
            return dxService.getOrgInfo(username)
                .catch(() => {
                    if (service.currentConnection) {
                        service.currentConnection.connection = undefined;
                    }
                    return enterCredentials();
                })
                .then(orgInf => {
                    service.currentConnection = service.addConnection(orgInf, true);
                    vscode.window.forceCode.config = readConfigFile(orgInf.username);

                    const sfdxPath = path.join(operatingSystem.getHomeDir(), '.sfdx', orgInf.username + '.json');
                    const refreshToken: string = fs.readJsonSync(sfdxPath).refreshToken;
                    service.currentConnection.connection = new jsforce.Connection({
                        oauth2: {
                            clientId: service.currentConnection.orgInfo.clientId || "SalesforceDevelopmentExperience"
                        },
                        instanceUrl: service.currentConnection.orgInfo.instanceUrl,
                        accessToken: service.currentConnection.orgInfo.accessToken,
                        refreshToken: refreshToken,
                        version: (vscode.window.forceCode && vscode.window.forceCode.config
                            && vscode.window.forceCode.config.apiVersion
                            ? vscode.window.forceCode.config.apiVersion : constants.API_VERSION),
                    });

                    return service.currentConnection.connection.identity().then(res => {
                        service.currentConnection.orgInfo.userId = res.user_id;
                        service.currentConnection.isLoggedIn = true;
                        vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', true);
                        return Promise.resolve(false);
                    });
                });
        } else {
            vscode.window.forceCode.config = readConfigFile(username);
            return Promise.resolve(true);
        }
    }

    private login(service: FCConnectionService, hadToLogIn: boolean): Promise<boolean> {
        vscode.window.forceCode.containerAsyncRequestId = undefined;
        vscode.window.forceCode.containerId = undefined;
        vscode.window.forceCode.containerMembers = [];
        const projPath: string = vscode.window.forceCode.workspaceRoot;
        return checkConfig(vscode.window.forceCode.config).then(config => {
            vscode.window.forceCode.config = config;
            saveConfigFile(config.username, config);
            vscode.window.forceCode.projectRoot = path.join(projPath, config.src);
            
            const forceSfdxPath = path.join(projPath, '.forceCode', config.username, '.sfdx')
            const sfdxPath = path.join(projPath, '.sfdx')
            var sfdxStat;
            try {
                sfdxStat = fs.lstatSync(sfdxPath);
            } catch(e) {}

            if (sfdxStat) {
                if(sfdxStat.isSymbolicLink()) {
                    // if it exists and is a symbolic link, remove it so we can relink with the new login
                    fs.unlinkSync(sfdxPath);
                } else {
                    // not a symbolic link, so move it because it's an SFDX proj folder
                    fs.moveSync(sfdxPath, forceSfdxPath, { overwrite: true });
                }
            }
            if (!fs.existsSync(forceSfdxPath)) {
                fs.mkdirpSync(forceSfdxPath);
            }
            // link to the newly logged in org's sfdx folder in .forceCode/USERNAME/.sfdx
            fs.symlinkSync(forceSfdxPath, sfdxPath, 'junction');

            vscode.window.forceCode.conn = service.currentConnection.connection;
            // this triggers a call to configuration() because the force.json file watcher, which triggers
            // refreshConnections()
            service.refreshConnsStatus();
            fs.outputFileSync(path.join(projPath, 'force.json'), 
                JSON.stringify({ lastUsername: config.username }, undefined, 4));
            return Promise.resolve(hadToLogIn);         
        });
        
    }

    public disconnect(conn: FCConnection): Promise<any> {
        const connIndex: number = this.getConnIndex(conn.orgInfo.username);
        if (connIndex !== -1) {
            const conn: FCConnection = this.connections.splice(connIndex, 1)[0];
            return conn.disconnect();
        }
        return Promise.resolve();
    }

    public getConnByUsername(userName: string): FCConnection {
        const index: number = this.getConnIndex(userName);
        if (index !== -1) {
            return this.connections[index];
        }
        return undefined;
    }

    public getSrcByUsername(username: string): string {
        const config: Config = readConfigFile(username);
        return config && config.src ? config.src : 'src';
    }

    public addConnection(orgInfo: FCOauth, saveToken?: boolean): FCConnection {
        if (orgInfo && orgInfo.username) {
            var connIndex: number = this.getConnIndex(orgInfo.username);
            if (connIndex === -1) {
                this.connections.push(new FCConnection(this, orgInfo));
                connIndex = this.getConnIndex(orgInfo.username);
            } else {
                const aToken: string = this.connections[connIndex].orgInfo.accessToken;
                Object.assign(this.connections[connIndex].orgInfo, orgInfo);
                // only the getOrgInfo command gives us the right access token, for some reason the others don't work
                if(!saveToken) {
                    this.connections[connIndex].orgInfo.accessToken = aToken;
                }
            }
            if(orgInfo.connectedStatus !== 'Connected' && orgInfo.connectedStatus !== 'Unknown') {
                this.connections[connIndex].isLoggedIn = false;
            } else {
                this.connections[connIndex].isLoggedIn = true;
            }
            return this.connections[connIndex];
        } else {
            return undefined;
        }
    }

    public getConnIndex(username: string): number {
        return this.connections.findIndex(cur => { return cur.orgInfo.username === username });
    }

    private sortFunc(a: FCConnection, b: FCConnection): number {
        var aStr = a.label.toUpperCase();
        var bStr = b.label.toUpperCase();
        return aStr.localeCompare(bStr);
    }
}