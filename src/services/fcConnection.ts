import * as vscode from 'vscode';
import * as path from 'path';
import { FCConnectionService, getHomeDir, readConfigFile, SFDX } from '.';
import { Connection } from 'jsforce';
import * as fs from 'fs-extra';
import { Config } from '../forceCode';
import { getSrcDir } from './configuration';

export interface FCOauth {
  username: string;
  loginUrl?: string;
  userId?: string;
  accessToken?: string;
  instanceUrl?: string;
  orgId?: string;
  clientId?: string;
  connectedStatus?: string;
  isExpired?: boolean;
  isDevHub?: boolean;
}

export class FCConnection extends vscode.TreeItem {
  private readonly parent: FCConnectionService;
  public connection: Connection | undefined;
  public orgInfo: FCOauth | SFDX;
  public isLoggedIn: boolean;
  public prevContext: string | undefined;

  constructor(parent: FCConnectionService, orgInfo: FCOauth | SFDX) {
    super(orgInfo.username, vscode.TreeItemCollapsibleState.None);

    this.parent = parent;
    this.orgInfo = orgInfo;
    this.isLoggedIn = false;
  }

  public getLabel(): string {
    return typeof this.label === 'string' ? this.label : this.label?.label || '';
  }

  public disconnect(): Promise<any> {
    if (this.isLoggedIn) {
      const sfdxPath = path.join(getHomeDir(), '.sfdx', this.orgInfo.username + '.json');
      if (fs.existsSync(sfdxPath)) {
        fs.removeSync(sfdxPath);
      }
      this.isLoggedIn = false;
      if (this.isCurrentConnection()) {
        this.parent.currentConnection = undefined;
        //vscode.window.forceCode.conn = undefined;
      }
      return this.parent.refreshConnections();
    } else {
      return Promise.resolve();
    }
  }

  public isCurrentConnection(): boolean {
    return this.parent.currentConnection?.orgInfo.username === this.orgInfo.username;
  }

  public showConnection() {
    this.prevContext = this.contextValue;
    const imagePath: string = path.join(vscode.window.forceCode.storageRoot, 'images');
    if (this.isCurrentConnection() && this.isLoggedIn) {
      this.iconPath = {
        dark: path.join(imagePath, 'greenCircleFilled.svg'),
        light: path.join(imagePath, 'greenCircleFilled.svg'),
      };
      this.contextValue = 'currentConn';
      this.command = undefined;
    } else if (this.isCurrentConnection()) {
      this.iconPath = {
        dark: path.join(imagePath, 'yellowCircleFilled.svg'),
        light: path.join(imagePath, 'yellowCircleFilled.svg'),
      };
      this.contextValue = 'currentConn';
      this.command = undefined;
    } else if (this.isLoggedIn) {
      this.command = {
        command: 'ForceCode.switchUser',
        title: '',
        arguments: [this.orgInfo],
      };
      this.iconPath = {
        dark: path.join(imagePath, 'greenCircle.svg'),
        light: path.join(imagePath, 'greenCircle.svg'),
      };
      this.contextValue = 'loggedInConn';
    } else {
      this.command = {
        command: 'ForceCode.login',
        title: '',
        arguments: [this.orgInfo],
      };
      this.iconPath = {
        dark: path.join(imagePath, 'yellowCircle.svg'),
        light: path.join(imagePath, 'yellowCircle.svg'),
      };
      this.contextValue = 'notLoggedInConn';
    }

    this.tooltip = this.isCurrentConnection()
      ? 'Current username'
      : 'Click to switch to ' + this.orgInfo.username;
    if (this.connection?.limitInfo?.apiUsage) {
      this.tooltip +=
        ' - Limits: ' +
        this.connection.limitInfo.apiUsage.used +
        ' / ' +
        this.connection.limitInfo.apiUsage.limit;
    }
    const config: Config = readConfigFile(this.orgInfo.username);
    super.label = config.alias.trim() !== '' ? config.alias : config.username;
    this.tooltip += '\nPROJECT PATH - ' + getSrcDir();
  }
}
