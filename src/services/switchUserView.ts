import {
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { operatingSystem } from '.';
import { SFDX } from './dxService';
var klaw: any = require('klaw');

export class SwitchUserViewService implements TreeDataProvider<Org> {
  private static instance: SwitchUserViewService;
  private orgs: Org[];
  private _onDidChangeTreeData: EventEmitter<
    Org | undefined
  > = new EventEmitter<Org | undefined>();
  public orgInfo: SFDX = {};

  public readonly onDidChangeTreeData: Event<Org | undefined> = this
    ._onDidChangeTreeData.event;

  public constructor() {
    console.log('Strating user service...');
    this.orgs = [];
    this.refreshOrgs(this);
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

  public addOrg(orgInfo: SFDX) {
    var theOrg: Org = new Org(this, orgInfo);
    this.orgs.push(theOrg);
    this._onDidChangeTreeData.fire();
  }

  public removeOrg(org: Org): boolean {
    const index = this.orgs.indexOf(org);
    if (index !== -1) {
      this.orgs.splice(index, 1);

      this._onDidChangeTreeData.fire();
      return true;
    }
    return false;
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

  public refreshOrgs(service: SwitchUserViewService): number {
    this.orgs = [];
    var numOrgs: number = 0;
    return klaw(operatingSystem.getHomeDir() + path.sep + '.sfdx' + path.sep)
      .on('data', function(file) {
        if(file.stats.isFile()) {
          var fileName: string = file.path.split(path.sep).pop().split('.')[0];
          if(fileName.indexOf('@') > 0) {
            const orgInfo: SFDX = fs.readJsonSync(file.path);
            service.addOrg(orgInfo);
            numOrgs++;
          }
        }
      })
      .on('end', function() {return numOrgs})
  }
}

export class Org extends TreeItem {
  private readonly switchUserView: SwitchUserViewService;
  public readonly userName: string;
  public readonly url: string;

  constructor(switchUserView: SwitchUserViewService, orgInfo: SFDX) {
    super(
      orgInfo.username,
      TreeItemCollapsibleState.None
    );

    this.switchUserView = switchUserView;
    this.userName = orgInfo.username;
    this.url = orgInfo.instanceUrl;

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