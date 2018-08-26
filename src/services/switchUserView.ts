import {
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  window,
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

  public constructor() {
    console.log('Strating user service...');
    this.orgs = [];
    this.refreshOrgs();
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

  public refreshOrgs() {
    this.refreshTheOrgs(this);
  }

  private refreshTheOrgs(service: SwitchUserViewService): boolean {
    this.orgs = [];
    return klaw(operatingSystem.getHomeDir() + path.sep + '.sfdx' + path.sep)
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
        const srcs: {[key: string]: {src: string, url: string}} = window.forceCode.config.srcs;
        if(srcs) {
          Object.keys(srcs).forEach(curOrg => {
            service.addOrg({username: curOrg, loginUrl: srcs[curOrg].url})
          });
        }
        service._onDidChangeTreeData.fire();
        return true;
      });
  }

  public getOrgInfoByUserName(userName: string): FCOauth {
    const index: number = this.findOrgIndex({orgInfo: {username: userName}});
    if(index !== -1) {
      return this.orgs[index].orgInfo;
    }
    return undefined;
  }

  private findOrgIndex(org: Org): number {
    return this.orgs.findIndex(curOrg => { return curOrg.orgInfo.username === org.orgInfo.username });
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
        dark: path.join(__filename, '..', '..', '..', '..', 'images', 'currentOrg.svg'),
        light: path.join(__filename, '..', '..', '..', '..', 'images', 'currentOrg.svg'),
      }
    } else {
      this.command = {
        command: 'ForceCode.switchUser',
        title: '',
        arguments: [orgInfo]
      }
    }
    this.tooltip = switchUserView.orgInfo.username === orgInfo.username ? 'Current username' : 'Click to switch to this username';
  }
}