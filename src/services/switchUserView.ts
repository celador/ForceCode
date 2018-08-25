import {
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  window,
} from 'vscode';
import { FCOrg } from '../forceCode';
import * as path from 'path';

export class SwitchUserViewService implements TreeDataProvider<Org> {
  private static instance: SwitchUserViewService;
  private orgs: Org[];
  private _onDidChangeTreeData: EventEmitter<
    Org | undefined
  > = new EventEmitter<Org | undefined>();

  public readonly onDidChangeTreeData: Event<Org | undefined> = this
    ._onDidChangeTreeData.event;

  public constructor() {
    this.orgs = [];
  }

  public static getInstance() {
    if (!SwitchUserViewService.instance) {
      SwitchUserViewService.instance = new SwitchUserViewService();
    }
    return SwitchUserViewService.instance;
  }

  public addOrgs(orgs: FCOrg[]) {
    if(orgs) {
      this.orgs = [];
      orgs.forEach(org => {
        this.addOrg(org.username, org.url, org.src);
      });
      this._onDidChangeTreeData.fire();
    }
  }

  public addOrg(userName: string, url: string, src: string) {
    var theOrg: Org = new Org(this, userName, url, src);
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
}

export class Org extends TreeItem {
  private readonly switchUserView: SwitchUserViewService;
  public readonly userName: string;
  public readonly url: string;
  public readonly src: string;

  constructor(switchUserView: SwitchUserViewService, userName: string, url: string, src?: string) {
    super(
      userName,
      TreeItemCollapsibleState.None
    );

    this.switchUserView = switchUserView;
    this.userName = userName;
    this.url = url;
    this.src = src ? src : 'src';

    if(window.forceCode.config.username === userName) {
      this.iconPath = {
        dark: path.join(__filename, '..', '..', '..', '..', 'images', 'currentOrg.svg'),
        light: path.join(__filename, '..', '..', '..', '..', 'images', 'currentOrg.svg'),
      }
    } else {
      this.command = {
        command: 'ForceCode.switchUser',
        title: '',
        arguments: [{username: this.userName, url: this.url, src: this.src}]
      }
    }
    this.tooltip = window.forceCode.config.username === userName ? 'Current username' : 'Click to switch to this username';
  }
}