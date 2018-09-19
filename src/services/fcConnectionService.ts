import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { dxService, FCOauth, FCConnection, operatingSystem } from '.';
import { credentials } from '../commands';
import constants from '../models/constants';
const jsforce: any = require('jsforce');
import klaw = require('klaw');

export const REFRESH_EVENT_NAME: string = 'refreshConns';

export class FCConnectionService implements vscode.TreeDataProvider<FCConnection> {
    private static instance: FCConnectionService;
    private connections: FCConnection[];
    private _onDidChangeTreeData: vscode.EventEmitter<FCConnection | undefined>
        = new vscode.EventEmitter<FCConnection | undefined>();

    public readonly onDidChangeTreeData: vscode.Event<FCConnection | undefined> =
        this._onDidChangeTreeData.event;
    public currentConnection: FCConnection;

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
        const loggedIn: boolean = this.currentConnection && this.currentConnection.isLoggedIn();
        if (loggedIn) {
            vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', true);
        } else {
            vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', false);
        }
        return loggedIn;
    }

    public refreshConnections(): Promise<boolean> {
        return dxService.orgList()
            .then(() => {
                return this.refreshTheConns(this);
            });
    }

    private refreshTheConns(service: FCConnectionService): Promise<boolean> {
        return new Promise((resolve) => {
            klaw(path.join(operatingSystem.getHomeDir(), '.sfdx'))
                .on('data', function (file) {
                    if (file.stats.isFile()) {
                        var fileName: string = file.path.split(path.sep).pop().split('.')[0];
                        if (fileName.indexOf('@') > 0) {
                            const orgInfo: FCOauth = fs.readJsonSync(file.path);
                            service.addConnection(orgInfo);
                        }
                    }
                })
                .on('end', function () {
                    const fcConfig = (vscode.window.forceCode && vscode.window.forceCode.config ? vscode.window.forceCode.config : undefined);
                    const srcs: { [key: string]: { src: string, url: string } } = fcConfig && fcConfig.srcs && fcConfig.srcs !== {} ? fcConfig.srcs : undefined;
                    if (srcs) {
                        Object.keys(srcs).forEach(curOrg => {
                            if (!service.getConnByUsername(curOrg)) {
                                service.addConnection({ username: curOrg, loginUrl: srcs[curOrg].url });
                            }
                        });
                    }
                    // tell the connections to refresh their text/icons
                    service.refreshConnsStatus();
                    console.log('Orgs refreshed');
                    resolve(true);
                });
        });
    }

    // this is a check that will refresh the orgs and check if logged in. if not, it asks to log in
    public checkLoginStatus(): Promise<boolean> {
        return this.refreshConnections().then(() => {
            if (!this.isLoggedIn()) {
                return this.connect(this.currentConnection.orgInfo);
            } else {
                return true;
            }
        });
    }

    public connect(orgInfo: FCOauth): Promise<any> {
        this.currentConnection = this.addConnection(orgInfo);
        return this.setupConn(this)
            .then(res => {
                return this.login(this, res);
            })
    }

    private setupConn(service: FCConnectionService): Promise<boolean> {
        if (!this.isLoggedIn() || (service.currentConnection && !service.currentConnection.connection)) {
            return dxService.getOrgInfo()
                .catch(() => {
                    if(service.currentConnection) {
                        service.currentConnection.connection = undefined;
                    }
                    return credentials();
                })
                .then(orgInf => {
                    service.currentConnection = service.addConnection(orgInf);

                    if (!service.currentConnection.connection) {
                        service.currentConnection.orgInfo.refreshToken = fs.readJsonSync(this.currentConnection.sfdxPath).refreshToken;
                        service.currentConnection.connection = new jsforce.Connection({
                            oauth2: {
                                clientId: service.currentConnection.orgInfo.clientId || "SalesforceDevelopmentExperience"
                            },
                            instanceUrl: service.currentConnection.orgInfo.instanceUrl,
                            accessToken: service.currentConnection.orgInfo.accessToken,
                            refreshToken: service.currentConnection.orgInfo.refreshToken,
                            version: (vscode.window.forceCode && vscode.window.forceCode.config 
                                && vscode.window.forceCode.config.apiVersion 
                                ? vscode.window.forceCode.config.apiVersion : constants.API_VERSION),
                        });

                        return service.currentConnection.connection.identity().then(res => {
                            service.currentConnection.orgInfo.userId = res.user_id;
                            return Promise.resolve(false);
                        });
                    }
                });
        } else {
            return Promise.resolve(true);
        }
    }

    private login(service: FCConnectionService, hadToLogIn: boolean): Promise<boolean> {
        const orgInfo: FCOauth = service.currentConnection.orgInfo;
        vscode.window.forceCode.config.url = orgInfo.loginUrl;
        vscode.window.forceCode.config.username = orgInfo.username;
        const projPath: string = vscode.window.forceCode.workspaceRoot;
        vscode.window.forceCode.config.src = service.getSrcByUsername(orgInfo.username);
        vscode.window.forceCode.projectRoot = path.join(projPath, vscode.window.forceCode.config.src);
        if (!fs.existsSync(path.join(projPath, '.forceCode', orgInfo.username, '.sfdx'))) {
            fs.mkdirpSync(path.join(projPath, '.forceCode', orgInfo.username, '.sfdx'));
        }
        if (fs.existsSync(path.join(projPath, '.sfdx'))) {
            fs.removeSync(path.join(projPath, '.sfdx'));
        }
        fs.symlinkSync(path.join(projPath, '.forceCode', orgInfo.username, '.sfdx'), path.join(projPath, '.sfdx'), 'junction');
        vscode.window.forceCode.conn = this.currentConnection.connection;
        // this triggers a call to configuration() because the force.json file watcher, which triggers
        // refreshConnections()
        service.refreshConnsStatus();
        fs.outputFileSync(path.join(projPath, 'force.json'), JSON.stringify(vscode.window.forceCode.config, undefined, 4));
        return Promise.resolve(hadToLogIn);
    }

    public disconnect(conn: FCConnection): Promise<any> {
        const connIndex: number = this.getConnIndex(conn.orgInfo.username);
        if (connIndex !== -1) {
            this.connections.splice(connIndex, 1);
            return this.currentConnection.disconnect();
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
        const fcConfig = vscode.window.forceCode ? vscode.window.forceCode.config : undefined;
        return (fcConfig && fcConfig.srcs && fcConfig.srcs[username]
                ? fcConfig.srcs[username].src
                : (fcConfig.srcDefault && fcConfig.srcDefault !== '' ? fcConfig.srcDefault : 'src'));
    }

    public addConnection(orgInfo: FCOauth): FCConnection {
        if (orgInfo && orgInfo.username) {
            var connIndex: number = this.getConnIndex(orgInfo.username);
            if (connIndex === -1) {
                this.connections.push(new FCConnection(this, orgInfo));
                connIndex = this.getConnIndex(orgInfo.username);
            } else {
                Object.assign(this.connections[connIndex].orgInfo, orgInfo);
            }
            return this.connections[connIndex];
        } else {
            return undefined;
        }
    }

    private getConnIndex(username: string): number {
        return this.connections.findIndex(cur => { return cur.orgInfo.username === username });
    }

    private sortFunc(a: FCConnection, b: FCConnection): number {
        var aStr = a.label.toUpperCase();
        var bStr = b.label.toUpperCase();
        return aStr.localeCompare(bStr);
    }
}