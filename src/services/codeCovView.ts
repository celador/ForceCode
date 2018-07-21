import {
    Command,
    Event,
    EventEmitter,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
    window
  } from 'vscode';
  import * as fs from 'fs';
  import { IWorkspaceMember, ICodeCoverage, FCWorkspaceMembers } from '../forceCode';
  import * as path from 'path';

  var ClassType = {
      CoveredClass : 'Sufficient Coverage',
      TestClass : 'Test Classes',
      UncoveredClass : 'Insufficient Coverage',
  }

  interface FCClasses {
    [key: string]: FCFile[];
  }
  
  export class CodeCovViewService implements TreeDataProvider<FCFile> {
    private static instance: CodeCovViewService;
    private readonly classes: FCClasses;
    private _onDidChangeTreeData: EventEmitter<
     FCFile | undefined
    > = new EventEmitter <FCFile | undefined>();
  
    public readonly onDidChangeTreeData: Event <FCFile | undefined> = this
      ._onDidChangeTreeData.event;
  
    public constructor() {
      this.classes = {};
    }
  
    public static getInstance() {
      if (!CodeCovViewService.instance) {
        CodeCovViewService.instance = new CodeCovViewService();
      }
      return CodeCovViewService.instance;
    }

    public addClasses(wsMembers: FCWorkspaceMembers) {
        Object.keys(wsMembers).forEach(curId => {
            this.addClass(wsMembers[curId]);
        });
    }
  
    public addClass(wsMember: IWorkspaceMember) {
      var type: string = ClassType.UncoveredClass;
      // we only want classes and triggers
      if(wsMember.type !== 'ApexClass' && wsMember.type !== 'ApexTrigger') {
          return undefined;
      }

      var name = wsMember.path.split(path.sep).pop();
      if(wsMember.coverage) {
        var fileCoverage: ICodeCoverage = wsMember.coverage;
        var total: number = fileCoverage.NumLinesCovered + fileCoverage.NumLinesUncovered;
        var percent = Math.floor((fileCoverage.NumLinesCovered / total) * 100);
        name = percent + '% ' + name;
        if(percent >= 75) {
            type = ClassType.CoveredClass;
        } 
        // this next check needs changed to something different, as there are problems reading the file
      } else if(fs.readFileSync(wsMember.path).toString().toLowerCase().includes('@istest')) {
        type = ClassType.TestClass;
      } else {
        name = '0% ' + name;
      }

      var theClass: FCFile = new FCFile(name, TreeItemCollapsibleState.None, type, wsMember);
      if(!this.classes[type]) {
        this.classes[type] = new Array<FCFile>();
      } 
      var exMem = this.findById(wsMember.id);
      if(exMem) {
        this.removeClass(exMem);
      }
      this.classes[type].push(theClass);
  
      this._onDidChangeTreeData.fire();
    }
  
    public removeClass(task: FCFile): boolean {
      const index = this.classes[task.type].indexOf(task);
      if (index !== -1) {
        this.classes[task.type].splice(index, 1);
  
        this._onDidChangeTreeData.fire();
        return true;
      } 
      return false;
    }
  
    public getTreeItem(element: FCFile): TreeItem {
      return element;
    }
  
    public getChildren(element?: FCFile): FCFile[] {
      if (!element) {
        var fcFiles: FCFile[] = [];
        // This is the root node
        Object.keys(this.classes).forEach(val => {
            fcFiles.push(new FCFile(val, TreeItemCollapsibleState.Collapsed, val));
        });
        fcFiles.sort(this.sortFunc);

        return fcFiles;
      } else if(!element.wsMember) {
        this.classes[element.type].sort(this.sortFunc);
        return this.classes[element.type];
      }
  
      return [];
    }
  
    public getParent(element: FCFile): any {
      return null;    // this is the parent
    }

    private findById(id: string): FCFile {
      var element: FCFile;
      Object.keys(this.classes).some(cur => {
        element = this.classes[cur].find(curFind => {
            return curFind.wsMember.id === id;
        });
        return element !== undefined;
      });
      return element;
    }

    private sortFunc(a: FCFile, b: FCFile): number {
        var aStr = a.name.split('% ').pop().toUpperCase();
        var bStr = b.name.split('% ').pop().toUpperCase();
        return aStr.localeCompare(bStr);
    }
  }
  
  export class FCFile extends TreeItem {
    public readonly collapsibleState: TreeItemCollapsibleState;
    public readonly name: string;
    public readonly wsMember: IWorkspaceMember;
    public readonly type: string;
    public readonly command: Command;
  
    constructor(name: string, collapsibleState: TreeItemCollapsibleState, type: string, wsMember?: IWorkspaceMember) {
      super(
        name,
        collapsibleState
      );
  
      this.collapsibleState = collapsibleState;
      this.wsMember = wsMember;
      this.type = type;
      this.name = name;

      if(wsMember) {
          this.command = {
              command: 'ForceCode.openOnClick',
              title: '',
              arguments: [wsMember.path]
          }
      }
    }
  }