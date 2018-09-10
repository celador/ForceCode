import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { operatingSystem, dxService } from '.';
import constants from '../models/constants';
import { OrgListResult } from './dxService';
import { credentials } from '../commands';
const jsforce: any = require('jsforce');

export interface FCOauth {
    username?: string,
    loginUrl?: string,
    id?: string,
    userId?: string,
    accessToken?: string,
    instanceUrl?: string,
    refreshToken?: string,
    orgId?: string,
    clientId?: string,
    connectedStatus?: string,
}

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

    public isLoggedIn(): boolean {
        const loggedIn: boolean = this.currentConnection && this.currentConnection.isLoggedIn();
        if (loggedIn) {
            vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', true);
        } else {
            vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', false);
        }
        return loggedIn; 
    }

    public refreshConnections(): Promise<OrgListResult> {
        return dxService.orgList().then(res => { return Promise.resolve(res) }, err => { return Promise.resolve(undefined); })
            .then(res => {
                if(res) {
                    res.orgs.forEach(curUN => {
                        this.addConnection(curUN);
                    });
                }
                const fcConfig = (vscode.window.forceCode && vscode.window.forceCode.config ? vscode.window.forceCode.config : undefined);
                const srcs: { [key: string]: { src: string, url: string } } = fcConfig && fcConfig.srcs ? fcConfig.srcs : undefined;
                if (srcs) {
                    Object.keys(srcs).forEach(curOrg => {
                        if(this.getConnIndex(curOrg) === -1) {
                            this.addConnection({ username: curOrg, loginUrl: srcs[curOrg].url });
                        }
                    });
                }
                this.connections.sort(this.sortFunc);
                this.refreshView();
                console.log('Connections refreshed');
                return res;
            });
    }

    // this is a check that will refresh the orgs and check if logged in. if not, it asks to log in
    public checkLoginStatus(): Promise<boolean> {
        return this.refreshConnections().then(() => {
            return this.currentConnection.connect();
        });
    }

    public login(orgInf: FCOauth): Promise<any> {
        return this.checkLogin(orgInf).then(orgInfo => {
            this.currentConnection = this.addConnection(orgInfo);
            vscode.window.forceCode.config.url = orgInfo.loginUrl;
            vscode.window.forceCode.config.username = orgInfo.username;
            const projPath: string = vscode.window.forceCode.workspaceRoot;
            vscode.window.forceCode.config.src = this.getSrcByUsername(orgInfo.username);
            vscode.window.forceCode.projectRoot = path.join(projPath, vscode.window.forceCode.config.src);
            if (!fs.existsSync(path.join(projPath, '.forceCode', orgInfo.username, '.sfdx'))) {
                fs.mkdirpSync(path.join(projPath, '.forceCode', orgInfo.username, '.sfdx'));
            }
            if(fs.existsSync(path.join(projPath, '.sfdx'))) {
                fs.removeSync(path.join(projPath, '.sfdx'));
            }
            fs.symlinkSync(path.join(projPath, '.forceCode', orgInfo.username, '.sfdx'), path.join(projPath, '.sfdx'), 'junction');
            vscode.window.forceCode.conn = undefined;
            // this triggers a call to configuration() because the force.json file watcher, which triggers
            // refreshConnections()
            fs.outputFileSync(path.join(projPath, 'force.json'), JSON.stringify(vscode.window.forceCode.config, undefined, 4));
            return Promise.resolve();
        });
    }

    private checkLogin(orgInfo: FCOauth): Promise<FCOauth> {
        if(orgInfo && orgInfo.username && orgInfo.loginUrl) {
            return Promise.resolve(orgInfo);
        } else {
            return credentials();
        }
    }

    public logout(): Promise<any> {
        if(this.currentConnection) {
            const connIndex: number = this.getConnIndex(this.currentConnection.orgInfo.username);
            if (connIndex !== -1) {
                return this.currentConnection.disconnect().then(() => {
                    vscode.window.forceCode.conn = undefined;
                    this.currentConnection = undefined;
                    this.connections.splice(connIndex, 1);
                    this.refreshView();
                    return Promise.resolve();
                })
            } 
        }
        return Promise.resolve();
    }

    public getOrgInfoByUserName(userName: string): FCOauth {
        const index: number = this.getConnIndex(userName);
        if (index !== -1) {
            return this.connections[index].orgInfo;
        }
        return undefined;
    }

    public getSrcByUsername(username: string): string {
        const fcConfig = vscode.window.forceCode ? vscode.window.forceCode.config : undefined;
        return vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep
            + (fcConfig && fcConfig.srcs && fcConfig.srcs[username]
                ? fcConfig.srcs[username].src
                : (fcConfig.srcDefault ? fcConfig.srcDefault : 'src'));
    }

    private addConnection(orgInfo: FCOauth): FCConnection {
        if(orgInfo && orgInfo.username && orgInfo.loginUrl) {
            var connIndex: number = this.getConnIndex(orgInfo.username);
            if(connIndex === -1) {
                this.connections.push(new FCConnection(this, orgInfo));
                connIndex = this.getConnIndex(orgInfo.username);
            } else {
                this.connections[connIndex].orgInfo = orgInfo;
            }
            this.connections[connIndex].showConnection();
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

export class FCConnection extends vscode.TreeItem {
    private readonly parent: FCConnectionService;
    private limInterval;
    private prevLimits: number = 0;
    public readonly sfdxPath: string;
    public connection: any;
    public orgInfo: FCOauth;

    constructor(parent: FCConnectionService, orgInfo: FCOauth) {
        super(
            orgInfo.username,
            vscode.TreeItemCollapsibleState.None
        );

        this.parent = parent;
        this.orgInfo = orgInfo;
        this.sfdxPath = path.join(operatingSystem.getHomeDir(), '.sfdx', orgInfo.username + '.json');
        this.showConnection();
        this.showLimitsService();
    }

    public isLoggedIn(): boolean {
        return fs.existsSync(this.sfdxPath);
    }

    public connect(): Promise<boolean> {
        if (!this.isLoggedIn() || !this.connection) {
            return dxService.getOrgInfo()
                .catch(this.login)
                .then(orgInf => {
                    this.orgInfo = orgInf;
                    this.orgInfo.refreshToken = fs.readJsonSync(this.sfdxPath).refreshToken;
                    this.connection = new jsforce.Connection({
                        oauth2: {
                            clientId: this.orgInfo.clientId
                        },
                        instanceUrl : this.orgInfo.instanceUrl,
                        accessToken : this.orgInfo.accessToken,
                        refreshToken: this.orgInfo.refreshToken,
                        version: vscode.window.forceCode.config.apiVersion || constants.API_VERSION,
                    });

                    return this.connection.identity().then(res => {
                        this.orgInfo.userId = res.user_id;
                        this.showConnection();
                        this.parent.refreshView();
                        return Promise.resolve(false);
                    });
                });
        } else {
            return Promise.resolve(true);
        }
    }

    public disconnect(): Promise<any> {
        if(this.isLoggedIn()) {
            if (this.limInterval) {
                clearInterval(this.limInterval);
            }
            return dxService.logout().then(() => {
                return this.parent.refreshConnections();
            });
        }
    }

    public showConnection() {
        if (this.parent.currentConnection && this.parent.currentConnection.orgInfo && this.parent.currentConnection.orgInfo.username === this.orgInfo.username) {
            vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', true);
            this.iconPath = {
                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircleFilled.svg'),
                light: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircleFilled.svg'),
            }
        } else if (this.isLoggedIn()) {
            this.command = {
                command: 'ForceCode.switchUser',
                title: '',
                arguments: [this.orgInfo]
            }
            this.iconPath = {
                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircle.svg'),
                light: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircle.svg'),
            }
        } else {
            this.command = {
                command: 'ForceCode.login',
                title: '',
                arguments: [this.orgInfo]
            }
            this.iconPath = {
                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'yellowCircle.svg'),
                light: path.join(__filename, '..', '..', '..', '..', 'images', 'yellowCircle.svg'),
            }
        }
        this.showLimits();
    }

    private login(): Promise<any> {
        return credentials();
    }

    private showLimitsService() {
        if (this.limInterval) {
            clearInterval(this.limInterval);
        }
        this.limInterval = setInterval(function (service: FCConnection) {
            service.showLimits();
        }, 5000, this);
    }

    private showLimits() {
        if (this.connection
            && this.connection.limitInfo
            && this.connection.limitInfo.apiUsage
            && this.prevLimits !== this.connection.limitInfo.apiUsage.used) {

            this.prevLimits = this.connection.limitInfo.apiUsage.used;
            this.tooltip = (this.parent.currentConnection.orgInfo.username === this.orgInfo.username 
                ? 'Current username' : 'Click to switch to ' + this.orgInfo.username)
                + ' - Limits: '
                + this.prevLimits + ' / ' + this.connection.limitInfo.apiUsage.limit
                + '\nPROJECT PATH - ' + this.parent.getSrcByUsername(this.orgInfo.username);
            this.parent.refreshView();
        }
    }
}