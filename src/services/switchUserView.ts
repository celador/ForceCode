import {
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  window,
  workspace
} from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { operatingSystem } from '.';
var klaw: any = require('klaw');

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

export class SwitchUserViewService implements TreeDataProvider<Org> {
  private static instance: SwitchUserViewService;
  private orgs: Org[];
  private _onDidChangeTreeData: EventEmitter<
    Org | undefined
  > = new EventEmitter<Org | undefined>();
  public orgInfo: FCOauth = {};

  public readonly onDidChangeTreeData: Event<Org | undefined> = this
    ._onDidChangeTreeData.event;

  private limInterval;
  private prevLimits: number = 0;

  public constructor() {
    console.log('Starting user service...');
    this.orgs = [];
    this.showLimitsService();
  }

  public static getInstance() {
    if (!SwitchUserViewService.instance) {
      SwitchUserViewService.instance = new SwitchUserViewService();
    }
    return SwitchUserViewService.instance;
  }

  public isLoggedIn(): boolean {
    return fs.existsSync(operatingSystem.getHomeDir() + path.sep + '.sfdx' + path.sep + this.orgInfo.username + '.json');
  }

  public getTreeItem(element: Org): TreeItem {
    return element;
  }

  public getChildren(element?: Org): Org[] {
    if (!element) {
      // This is the root node
      return this.orgs;
    }

    return [];
  }

  public getParent(element: Org): any { 
    return null;    // this is the parent
  }

  public refreshOrgs(): Promise<boolean> {
    return this.refreshTheOrgs(this);
  }

  private refreshTheOrgs(service: SwitchUserViewService): Promise<boolean> {
    this.orgs = [];
    return new Promise((resolve, reject) => {
      klaw(operatingSystem.getHomeDir() + path.sep + '.sfdx' + path.sep)
      .on('data', function(file) {
        if(file.stats.isFile()) {
          var fileName: string = file.path.split(path.sep).pop().split('.')[0];
          if(fileName.indexOf('@') > 0) {
            const orgInfo: FCOauth = fs.readJsonSync(file.path);
            service.addOrg(orgInfo);
          }
        }
      })
      .on('end', function() {
        const fcConfig = window.forceCode.config;
        const srcs: {[key: string]: {src: string, url: string}} = fcConfig && fcConfig.srcs ? fcConfig.srcs : undefined;
        if(srcs) {
          Object.keys(srcs).forEach(curOrg => {
            if(!service.getOrgInfoByUserName(curOrg)) {
              service.addOrg({username: curOrg, loginUrl: srcs[curOrg].url});
            }
          });
        }
        service.orgs.sort(service.sortFunc);
        service._onDidChangeTreeData.fire();
        console.log('Orgs refreshed');
        resolve(true);
      });
    });
  }

  public getOrgInfoByUserName(userName: string): FCOauth {
    const index: number = this.findOrgIndex({orgInfo: {username: userName}});
    if(index !== -1) {
      return this.orgs[index].orgInfo;
    }
    return undefined;
  }

  public getSrcByUsername(username: string): string {
    const fcConfig = window.forceCode.config;
    return workspace.workspaceFolders[0].uri.fsPath + path.sep
            + (fcConfig && fcConfig.srcs && fcConfig.srcs[username] 
            ? fcConfig.srcs[username].src 
            : (fcConfig.srcDefault ? fcConfig.srcDefault : 'src'));
  }

  private showLimitsService() {
    if(this.limInterval) {
      clearInterval(this.limInterval);
    }
    this.limInterval = setInterval(function(service) { 
      if (service.orgInfo
        && service.orgInfo.accessToken
        && window.forceCode.conn 
        && window.forceCode.conn.limitInfo 
        && window.forceCode.conn.limitInfo.apiUsage
        && service.prevLimits !== window.forceCode.conn.limitInfo.apiUsage.used) {

        service.prevLimits = window.forceCode.conn.limitInfo.apiUsage.used;
        const curOrgIndex: number = service.findOrgIndexByUsername(service.orgInfo.username);
        if(curOrgIndex !== -1) {
          service.orgs[curOrgIndex].tooltip = 'Current username - Limits: ' 
            + service.prevLimits + ' / ' + window.forceCode.conn.limitInfo.apiUsage.limit
            + '\nPROJECT PATH - ' + service.getSrcByUsername(service.orgInfo.username);
          service._onDidChangeTreeData.fire();
        }
      }
    }, 5000, this);
  }

  private sortFunc(a: Org, b: Org): number {
    var aStr = a.label.toUpperCase();
    var bStr = b.label.toUpperCase();
    return aStr.localeCompare(bStr);
  }

  private findOrgIndex(org: Org): number {
    return this.orgs.findIndex(curOrg => { return curOrg.orgInfo.username === org.orgInfo.username });
  }

  private findOrgIndexByUsername(username: string): number {
    return this.orgs.findIndex(curOrg => { return curOrg.orgInfo.username === username });
  }

  private addOrg(orgInfo: FCOauth) {
    const newOrg: Org = new Org(this, orgInfo);
    const index: number = this.findOrgIndex(newOrg);
    if(index !== -1) {
      this.orgs.splice(index, 1, newOrg);
    } else {
      this.orgs.push(newOrg);
    }
  }
}

export class Org extends TreeItem {
  public readonly orgInfo: FCOauth;

  constructor(switchUserView: SwitchUserViewService, orgInfo: FCOauth) {
    super(
      orgInfo.username,
      TreeItemCollapsibleState.None
    );

    this.orgInfo = orgInfo;

    if(switchUserView.orgInfo.username === orgInfo.username) {
      this.iconPath = {
        dark: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircleFilled.svg'),
        light: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircleFilled.svg'),
      }
      this.tooltip = 'Current username';
    } else if(orgInfo.accessToken) {
      this.command = {
        command: 'ForceCode.switchUser',
        title: '',
        arguments: [orgInfo]
      }
      this.iconPath = {
        dark: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircle.svg'),
        light: path.join(__filename, '..', '..', '..', '..', 'images', 'greenCircle.svg'),
      }
      this.tooltip = 'Click to switch to ' + orgInfo.username;
    } else {
      this.command = {
        command: 'ForceCode.login',
        title: '',
        arguments: [orgInfo]
      }
      this.iconPath = {
        dark: path.join(__filename, '..', '..', '..', '..', 'images', 'yellowCircle.svg'),
        light: path.join(__filename, '..', '..', '..', '..', 'images', 'yellowCircle.svg'),
      }
      this.tooltip = 'Click to login to ' + orgInfo.username;
    }
    this.tooltip += '\nPROJECT PATH - ' + switchUserView.getSrcByUsername(orgInfo.username);
  }
}