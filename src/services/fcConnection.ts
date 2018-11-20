import * as vscode from 'vscode';
import * as path from 'path';
import { FCConnectionService, operatingSystem } from '.';
import { Connection } from 'jsforce';
import * as fs from 'fs-extra';

export interface FCOauth {
    username?: string,
    loginUrl?: string,
    userId?: string,
    accessToken?: string,
    instanceUrl?: string,
    orgId?: string,
    clientId?: string,
    connectedStatus?: string,
    isExpired?: boolean
}

export class FCConnection extends vscode.TreeItem {
    private readonly parent: FCConnectionService;
    private limInterval;
    public connection: Connection;
    public orgInfo: FCOauth;
    public isLoggedIn: boolean;
    public prevContext: string;

    constructor(parent: FCConnectionService, orgInfo: FCOauth) {
        super(
            orgInfo.username,
            vscode.TreeItemCollapsibleState.None
        );

        this.parent = parent;
        this.orgInfo = orgInfo;
    }

    public disconnect(): Promise<any> {
        if(this.isLoggedIn) {
            if (this.limInterval) {
                clearInterval(this.limInterval);
            }
            const sfdxPath = path.join(operatingSystem.getHomeDir(), '.sfdx', this.orgInfo.username + '.json');
            if(fs.existsSync(sfdxPath)) {
                fs.removeSync(sfdxPath);
            }
            this.isLoggedIn = false;
            if(this.isCurrentConnection()) {
                this.parent.currentConnection = undefined;
                vscode.window.forceCode.conn = undefined;
            }
            return this.parent.refreshConnections();
        }
    }

    public isCurrentConnection(): boolean {
        return this.parent.currentConnection && this.parent.currentConnection.orgInfo.username === this.orgInfo.username;
    }

    public showConnection() {
        this.prevContext = this.contextValue;
        if (this.isCurrentConnection() && this.isLoggedIn) {
            this.iconPath = {
                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircleFilled.svg'),
                light: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircleFilled.svg'),
            }
            this.contextValue = 'currentConn';
            this.command = undefined;
        } else if (this.isCurrentConnection()) {
            this.iconPath = {
                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'yellowCircleFilled.svg'),
                light: path.join(__filename, '..', '..', '..', '..', 'images', 'yellowCircleFilled.svg'),
            }
            this.contextValue = 'currentConn';
            this.command = undefined;
        } else if (this.isLoggedIn) {
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
            this.contextValue = 'notLoggedInConn';
        }
        this.showLimits(this);
        this.showLimitsService(this);
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
            && service.connection.limitInfo.apiUsage) {

            service.tooltip += ' - Limits: ' + service.connection.limitInfo.apiUsage.used 
                + ' / ' + service.connection.limitInfo.apiUsage.limit;
        }
        const prevToolTip = service.tooltip;
        service.tooltip += '\nPROJECT PATH - ' + path.join(vscode.window.forceCode.workspaceRoot,
            service.parent.getSrcByUsername(service.orgInfo.username));
        if(prevToolTip !== service.tooltip || service.prevContext !== service.contextValue) {
            service.parent.refreshView();
        }
    }
}