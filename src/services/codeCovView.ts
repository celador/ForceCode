import {
  Command,
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  window,
  workspace,
} from 'vscode';
import { IWorkspaceMember, ICodeCoverage } from '../forceCode';
import * as path from 'path';
import * as fs from 'fs-extra';
import constants from './../models/constants';
import { dxService } from '.';

const ClassType = {
  CoveredClass: 'Sufficient Coverage',
  UncoveredClass: 'Insufficient Coverage',
  NoCoverageData: 'No Coverage Data',
  TestClass: 'Test Classes',
  NotInOrg: 'Not In Current Org',
  NotInSrc: 'Open Files Not In Src',
  NoShow: 'NoShow',
};

export class CodeCovViewService implements TreeDataProvider<FCFile> {
  private static instance: CodeCovViewService;
  private classes: Array<FCFile> = new Array<FCFile>();
  private _onDidChangeTreeData: EventEmitter<FCFile | undefined> = new EventEmitter<
    FCFile | undefined
  >();

  public readonly onDidChangeTreeData: Event<FCFile | undefined> = this._onDidChangeTreeData.event;

  public static getInstance() {
    if (!CodeCovViewService.instance) {
      console.log('Starting Code Coverage Service...');
      CodeCovViewService.instance = new CodeCovViewService();
    }
    return CodeCovViewService.instance;
  }

  public constructor() {
    window.onDidChangeActiveTextEditor(event => {
      this.refresh();
    });
  }

  public refresh() {
    this._onDidChangeTreeData.fire();
  }

  public addClass(wsMember: IWorkspaceMember) {
    const index: number = this.classes.findIndex(curClass => {
      return curClass.getWsMember().path === wsMember.path;
    });
    if (index !== -1) {
      this.classes[index].setWsMember(wsMember);
    } else {
      var newClass: FCFile = new FCFile(
        wsMember.name,
        TreeItemCollapsibleState.None,
        this,
        wsMember
      );
      this.classes.push(newClass);
    }
    this.refresh();
  }

  public findByNameAndType(name: string, type: string): FCFile {
    if (dxService.isEmptyUndOrNull(this.classes)) {
      return undefined;
    }
    return this.classes.find(cur => {
      const wsMem: IWorkspaceMember = cur.getWsMember();
      return wsMem && wsMem.name === name && wsMem.type === type;
    });
  }

  public findByType(type: string): FCFile[] {
    if (dxService.isEmptyUndOrNull(this.classes)) {
      return undefined;
    }
    return this.classes.filter(cur => {
      const wsMem: IWorkspaceMember = cur.getWsMember();
      return wsMem && wsMem.type === type;
    });
  }

  public findByPath(pa: string): FCFile {
    if (dxService.isEmptyUndOrNull(this.classes)) {
      return undefined;
    }
    return this.classes.find(cur => {
      const wsMem: IWorkspaceMember = cur.getWsMember();
      return wsMem && wsMem.path === pa;
    });
  }

  public findById(id: string): FCFile {
    if (dxService.isEmptyUndOrNull(this.classes)) {
      return undefined;
    }
    return this.classes.find(cur => {
      const wsMem: IWorkspaceMember = cur.getWsMember();
      return wsMem && wsMem.id === id;
    });
  }

  public removeClasses(fcfiles: FCFile[]) {
    fcfiles.forEach(cur => {
      this.removeClass(cur);
    });
  }

  public removeClass(fcfile: FCFile): boolean {
    const index = this.classes.indexOf(fcfile);
    if (index !== -1) {
      this.classes.splice(index, 1);
      this.refresh();
      return true;
    }
    return false;
  }

  public clear() {
    delete this.classes;
    this.classes = [];
    this.refresh();
  }

  public getTreeItem(element: FCFile): TreeItem {
    return element;
  }

  public getChildren(element?: FCFile): FCFile[] {
    if (!element) {
      var fcFiles: FCFile[] = [];
      // This is the root node
      Object.keys(ClassType).forEach(val => {
        if (val !== ClassType.NoShow) {
          var newFCFile: FCFile = new FCFile(
            ClassType[val],
            TreeItemCollapsibleState.Collapsed,
            this
          );
          newFCFile.setType(ClassType[val]);
          fcFiles.push(newFCFile);
        }
      });
      //fcFiles.sort(this.sortFunc);

      return fcFiles;
    } else if (!element.getWsMember()) {
      if (element.label === ClassType.NotInSrc) {
        var fcFiles: FCFile[] = [];
        if (workspace.textDocuments) {
          workspace.textDocuments.forEach(curEd => {
            if (
              !curEd.fileName.startsWith(window.forceCode.projectRoot) &&
              curEd.uri.scheme === 'file'
            ) {
              var newFCFile: FCFile = new FCFile(
                curEd.fileName.split(path.sep).pop(),
                TreeItemCollapsibleState.None,
                this
              );
              newFCFile.setType(ClassType.NotInSrc);
              newFCFile.command = {
                command: 'ForceCode.openOnClick',
                title: '',
                arguments: [curEd.fileName],
              };
              newFCFile.tooltip = `WARNING: This file isn\'t located in the current PROJECT PATH\n(${
                window.forceCode.projectRoot
              })`;
              fcFiles.push(newFCFile);
            }
          });
        }
        return fcFiles;
      } else {
        this.classes.sort(this.sortFunc);
        return this.classes.filter(res => {
          return res.getType() === element.getType();
        });
      }
    }

    return [];
  }

  public getParent(element: FCFile): any {
    const wsMem: IWorkspaceMember = element.getWsMember();
    if (wsMem && wsMem.id) {
      // there's a bug in vscode, so for future use
      var newFCFile: FCFile = new FCFile(
        element.getType(),
        TreeItemCollapsibleState.Expanded,
        this
      );
      newFCFile.setType(element.getType());
      return newFCFile;
    }
    return null; // this is the parent
  }

  private sortFunc(a: FCFile, b: FCFile): number {
    var aStr = a.label
      .split('% ')
      .pop()
      .toUpperCase();
    var bStr = b.label
      .split('% ')
      .pop()
      .toUpperCase();
    return aStr.localeCompare(bStr);
  }
}

export class FCFile extends TreeItem {
  public readonly collapsibleState: TreeItemCollapsibleState;
  public command: Command;

  private parent: CodeCovViewService;
  private wsMember: IWorkspaceMember;
  private type: string;

  constructor(
    name: string,
    collapsibleState: TreeItemCollapsibleState,
    parent: CodeCovViewService,
    wsMember?: IWorkspaceMember
  ) {
    super(name, collapsibleState);

    this.collapsibleState = collapsibleState;
    this.parent = parent;
    this.setWsMember(wsMember);
  }

  public setWsMember(newMem: IWorkspaceMember) {
    this.wsMember = newMem;

    // we only want classes and triggers
    if (
      !this.wsMember ||
      (this.wsMember.type !== 'ApexClass' && this.wsMember.type !== 'ApexTrigger')
    ) {
      this.type = ClassType.NoShow;
      return undefined;
    }

    super.label = this.wsMember.path.split(path.sep).pop();

    this.command = {
      command: 'ForceCode.openOnClick',
      title: '',
      arguments: [this.wsMember.path],
    };

    this.iconPath = undefined;
    if (!this.wsMember.id || this.wsMember.id === '') {
      this.type = ClassType.NotInOrg;
      return undefined;
    }

    this.type = ClassType.UncoveredClass;
    if (this.wsMember.coverage) {
      var fileCoverage: ICodeCoverage = this.wsMember.coverage;
      var total: number = fileCoverage.NumLinesCovered + fileCoverage.NumLinesUncovered;
      var percent = Math.floor((fileCoverage.NumLinesCovered / total) * 100);
      this.label = percent + '% ' + this.label;
      const imagePath: string = path.join(window.forceCode.storageRoot, 'images');
      if (percent >= 75) {
        this.type = ClassType.CoveredClass;
        this.iconPath = {
          dark: path.join(imagePath, 'greenCheck.svg'),
          light: path.join(imagePath, 'greenCheck.svg'),
        };
      } else {
        this.iconPath = {
          dark: path.join(imagePath, 'redEx.svg'),
          light: path.join(imagePath, 'redEx.svg'),
        };
      }
      // this next check needs changed to something different, as there are problems reading the file
    } else {
      var testFile: boolean = false;
      try {
        testFile = fs
          .readFileSync(this.wsMember.path)
          .toString()
          .toLowerCase()
          .includes('@istest');
      } catch (e) {}
      if (testFile) {
        this.type = ClassType.TestClass;
      } else {
        this.type = ClassType.NoCoverageData;
      }
    }
  }

  public updateWsMember(newMem: IWorkspaceMember) {
    this.parent.addClass(newMem);
  }

  public getWsMember(): IWorkspaceMember {
    return this.wsMember;
  }

  public getType(): string {
    return this.type;
  }

  public setType(newType: string) {
    this.type = newType;
  }

  // sometimes the times on the dates are a half second off, so this checks for within 2 seconds
  public compareDates(serverDate: string): boolean {
    const stat: fs.Stats = fs.statSync(this.wsMember.path);
    var localMS: number = stat.mtime.getTime();
    var serverMS: number = new Date(serverDate).getTime();

    if (localMS > serverMS || serverMS - localMS <= constants.MAX_TIME_BETWEEN_FILE_CHANGES) {
      return true;
    }

    console.log('Time difference between file changes: ' + (serverMS - localMS));
    return false;
  }
}
