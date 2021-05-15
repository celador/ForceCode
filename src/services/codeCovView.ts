import {
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  window,
  //workspace,
} from 'vscode';
import { IWorkspaceMember, ICodeCoverage } from '../forceCode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { codeCovViewService, MAX_TIME_BETWEEN_FILE_CHANGES, notifications } from '.';

export enum ClassType {
  CoveredClass = 'Sufficient Coverage',
  UncoveredClass = 'Insufficient Coverage',
  NoCoverageData = 'No Coverage Data',
  TestClass = 'Test Classes',
  NoShow = 'NoShow',
  Subclass = 'Subclass',
}

const folderWSMember: IWorkspaceMember = {
  name: 'FOLDER',
  path: '',
  type: ClassType.NoShow,
  id: '',
  coverage: new Map<string, ICodeCoverage>(),
};

export class CodeCovViewService implements TreeDataProvider<FCFile> {
  private static instance: CodeCovViewService;
  private classes: Map<string, FCFile> = new Map();
  private _onDidChangeTreeData: EventEmitter<FCFile | undefined> = new EventEmitter<
    FCFile | undefined
  >();

  public readonly onDidChangeTreeData: Event<FCFile | undefined> = this._onDidChangeTreeData.event;

  public static getInstance() {
    if (!CodeCovViewService.instance) {
      notifications.writeLog('Starting Code Coverage Service...');
      CodeCovViewService.instance = new CodeCovViewService();
    }
    return CodeCovViewService.instance;
  }

  public constructor() {
    window.onDidChangeActiveTextEditor((_event) => {
      this.refresh();
    });
  }

  public refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }

  public addClass(wsMember: IWorkspaceMember): FCFile {
    let retval: FCFile;
    if (this.classes.has(wsMember.path)) {
      this.classes.get(wsMember.path)!.setWsMember(wsMember);
      retval = this.classes.get(wsMember.path)!;
    } else {
      let newClass: FCFile = new FCFile(
        wsMember.name,
        TreeItemCollapsibleState.None,
        wsMember
      );
      this.classes.set(wsMember.path, newClass);
      retval = newClass;
    }
    this.refresh();
    return retval;
  }

  public findByType(type: string): FCFile[] | undefined {
    // TODO maybe a map of type to FCFile[]??
    let retVal: FCFile[] = [];
    //return this.classes.filter((cur) => {
    //  return cur.getWsMember().type === type;
    //});
    this.classes.forEach((cur) => {
      if(cur.getWsMember().type === type) {
        retVal.push(cur);
      }
    })

    return retVal;
  }

  public findByPath(pa: string): FCFile | undefined {
    return this.classes.get(pa);
  }

  public removeClasses(fcfiles: FCFile[]) {
    fcfiles.forEach((cur) => {
      this.removeClass(cur);
    });
  }

  public removeClass(fcfile: FCFile): boolean {
    return this.classes.delete(fcfile.getWsMember().path);
  }

  public clear() {
    this.classes.clear();
    this.refresh();
  }

  public getTreeItem(element: FCFile): TreeItem {
    return element;
  }

  public getChildren(element?: FCFile): FCFile[] {
    if (!element) {
      let fcFiles: FCFile[] = [];
      // This is the root node
      Object.entries(ClassType).forEach((val) => {
        if (val[1] !== ClassType.NoShow && val[1] !== ClassType.Subclass) {
          let newFCFile: FCFile = new FCFile(
            val[1],
            TreeItemCollapsibleState.Collapsed,
            folderWSMember
          );
          newFCFile.setType(val[1]);
          fcFiles.push(newFCFile);
        }
      });
      //fcFiles.sort(this.sortFunc);

      return fcFiles;
    } else if (element.getWsMember().type === ClassType.NoShow) {
        let retVal: FCFile[] = [];
        this.classes.forEach((res) => {
          if(res.getType() === element.getType()) {
            retVal.push(res);
          }
        })
        retVal.sort(this.sortFunc)
        return retVal;
    } else if (
      element.getType() === ClassType.CoveredClass ||
      element.getType() === ClassType.UncoveredClass
    ) {
      let fcFiles: FCFile[] = [];
      for (let [key, value] of element.getWsMember().coverage) {
        let total: number = value.NumLinesCovered + value.NumLinesUncovered;
        let percent = Math.floor((value.NumLinesCovered / total) * 100);
        if (key !== 'overall' && value.ApexTestClass && percent !== 0) {
          let newFCFile: FCFile = new FCFile(
            `${percent}% ${key}`,
            TreeItemCollapsibleState.None,
            folderWSMember,
            element
          );
          newFCFile.setType(ClassType.Subclass);
          newFCFile.tooltip =
            newFCFile.label + ' - ' + value.NumLinesCovered + '/' + total + ' lines covered';
          fcFiles.push(newFCFile);
        }
      }

      return fcFiles;
    }

    return [];
  }

  public getParent(element: FCFile): any {
    if (element.getWsMember().id !== '') {
      let newFCFile: FCFile = new FCFile(
        element.getType(),
        TreeItemCollapsibleState.Expanded,
        folderWSMember
      );
      newFCFile.setType(element.getType());
      return newFCFile;
    }
    return null; // this is the parent
  }

  private sortFunc(a: FCFile, b: FCFile): number {
    let aStr = a?.getLabel().split('% ').pop()?.toUpperCase() || '';
    let bStr = b?.getLabel().split('% ').pop()?.toUpperCase() || '';
    return aStr.localeCompare(bStr);
  }
}

export class FCFile extends TreeItem {
  public readonly collapsibleState: TreeItemCollapsibleState;

  private wsMember!: IWorkspaceMember;
  private type!: ClassType;
  private parentFCFile?: FCFile;

  constructor(
    name: string,
    collapsibleState: TreeItemCollapsibleState,
    wsMember: IWorkspaceMember,
    parentFCFile?: FCFile
  ) {
    super(name, collapsibleState);

    this.collapsibleState = collapsibleState;
    this.parentFCFile = parentFCFile;
    this.setWsMember(wsMember);
  }

  public getLabel(): string {
    return typeof this.label === 'string' ? this.label : this.label?.label || '';
  }

  public setWsMember(newMem: IWorkspaceMember) {
    this.wsMember = newMem;

    this.command = {
      command: 'ForceCode.changeCoverageDecoration',
      title: '',
      arguments: [this],
    };

    // we only want classes and triggers
    if (this.wsMember.type !== 'ApexClass' && this.wsMember.type !== 'ApexTrigger') {
      this.type = ClassType.NoShow;
      if (!this.parentFCFile) {
        this.command = undefined;
      }
      return undefined;
    }

    super.label = this.wsMember.path.split(path.sep).pop();

    this.iconPath = undefined;
    if (!this.wsMember.id || this.wsMember.id === '') {
      this.type = ClassType.NoShow;
      return undefined;
    }

    this.type = ClassType.UncoveredClass;
    this.tooltip = this.getLabel();
    let fileCoverage: ICodeCoverage | undefined = this.wsMember.coverage.get('overall');
    if (fileCoverage) {
      let total: number = fileCoverage.NumLinesCovered + fileCoverage.NumLinesUncovered;
      let percent = Math.floor((fileCoverage.NumLinesCovered / total) * 100);
      this.label = percent + '% ' + this.label;
      this.tooltip =
        this.label + ' - ' + fileCoverage.NumLinesCovered + '/' + total + ' lines covered';
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
      super.collapsibleState = TreeItemCollapsibleState.Collapsed;
      this.setCoverageTestClass('overall');
      // this next check needs changed to something different, as there are problems reading the file
    } else {
      let testFile: boolean = false;
      try {
        testFile = fs.readFileSync(this.wsMember.path).toString().toLowerCase().includes('@istest');
      } catch (e) {}
      if (testFile) {
        this.type = ClassType.TestClass;
        this.contextValue = 'fcTestClass';
      } else {
        this.type = ClassType.NoCoverageData;
      }
    }
  }

  public getWsMember(): IWorkspaceMember {
    return this.wsMember;
  }

  public getType(): ClassType {
    return this.type;
  }

  public setType(newType: ClassType) {
    this.type = newType;
  }

  public getParentFCFile(): FCFile | undefined {
    return this.parentFCFile;
  }

  public setCoverageTestClass(newCoverage: string | undefined) {
    this.wsMember.selectedCoverage = newCoverage || 'overall';
  }

  public addCoverage(testClass: string, coverage: ICodeCoverage) {
    this.wsMember.coverage.set(testClass, coverage);
    codeCovViewService.addClass(this.wsMember);
  }

  public clearCoverage() {
    this.wsMember.coverage.clear();
    super.collapsibleState = TreeItemCollapsibleState.None;
    codeCovViewService.addClass(this.wsMember);
  }

  // sometimes the times on the dates are a half second off, so this checks for within 2 seconds
  public compareDates(serverDate: string): boolean {
    if (!this.wsMember) {
      return true;
    }
    const stat: fs.Stats = fs.statSync(this.wsMember.path);
    let localMS: number = stat.mtime.getTime();
    let serverMS: number = new Date(serverDate).getTime();

    if (localMS > serverMS || serverMS - localMS <= MAX_TIME_BETWEEN_FILE_CHANGES) {
      return true;
    }

    notifications.writeLog('Time difference between file changes: ' + (serverMS - localMS));
    return false;
  }
}
