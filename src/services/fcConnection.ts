import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { operatingSystem, dxService, FCConnectionService } from '.';
import { credentials } from '../commands';

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