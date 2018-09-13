import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { operatingSystem, dxService, FCConnectionService } from '.';

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
        this.showLimitsService(this);
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
                if(this.isCurrentConnection()) {
                    this.parent.currentConnection = undefined;
                    vscode.window.forceCode.conn = undefined;
                }
                return this.parent.refreshConnections();
            });
        }
    }

    public isCurrentConnection(): boolean {
        return this.parent.currentConnection && this.parent.currentConnection.orgInfo.username === this.orgInfo.username;
    }

    public showConnection() {
        if (this.isCurrentConnection()) {
            vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', true);
            this.iconPath = {
                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircleFilled.svg'),
                light: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircleFilled.svg'),
            }
            this.contextValue = 'currentConn';
            this.command = undefined;
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
            this.contextValue = 'loggedInConn';
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
        this.showLimits(this);
    }

    private showLimitsService(service: FCConnection) {
        if (service.limInterval) {
            clearInterval(service.limInterval);
        }
        service.limInterval = setInterval(function (service: FCConnection) {
            service.showLimits(service);
        }, 5000, service);
    }

    private showLimits(service: FCConnection) {
        service.tooltip = (service.isCurrentConnection() ? 'Current username' 
            : 'Click to switch to ' + service.orgInfo.username);
        if (service.connection
            && service.connection.limitInfo
            && service.connection.limitInfo.apiUsage
            && service.prevLimits !== service.connection.limitInfo.apiUsage.used) {

            service.prevLimits = service.connection.limitInfo.apiUsage.used;
            service.tooltip += ' - Limits: ' + service.prevLimits 
                + ' / ' + service.connection.limitInfo.apiUsage.limit;
        }
        service.tooltip += '\nPROJECT PATH - ' + path.join(vscode.window.forceCode.workspaceRoot,
            service.parent.getSrcByUsername(service.orgInfo.username));
        service.parent.refreshView();
    }
}