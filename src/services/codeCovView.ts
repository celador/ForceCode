import {
    Command,
    Event,
    EventEmitter,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
    window,
    workspace
  } from 'vscode';
  import { IWorkspaceMember, ICodeCoverage } from '../forceCode';
  import * as path from 'path';
  import * as fs from 'fs-extra';
  import constants from './../models/constants';

  const ClassType = {
      CoveredClass : 'Sufficient Coverage',
      NoCoverageData : 'No Coverage Data',
      TestClass : 'Test Classes',
      UncoveredClass : 'Insufficient Coverage',
      NoShow: 'NoShow',
  }

  export class CodeCovViewService implements TreeDataProvider<FCFile> {
    private timeO: NodeJS.Timer;
    private static instance: CodeCovViewService;
    private classes: Array<FCFile> = new Array<FCFile>();
    private _onDidChangeTreeData: EventEmitter<
     FCFile | undefined
    > = new EventEmitter <FCFile | undefined>();
  
    public readonly onDidChangeTreeData: Event <FCFile | undefined> = this
      ._onDidChangeTreeData.event;
  
    public constructor() {
      try{
				// read previous metadata
				if(this.classes.length === 0) {
          const tempClasses: any[] = fs.readJsonSync(workspace.workspaceFolders[0].uri.fsPath + path.sep + 'wsMembers.json');
          tempClasses.forEach(cur => {
            this.classes.push(new FCFile(cur.name, TreeItemCollapsibleState.None, this, cur));
          });
          console.log('Done loading wsMember data.');
				}
			} catch (e) {
        console.log('Class data failed to load or no data found');
			}
    }
  
    public static getInstance() {
      if (!CodeCovViewService.instance) {
        console.log('Starting Code Coverage Service...');
        CodeCovViewService.instance = new CodeCovViewService();
      }
      return CodeCovViewService.instance;
    }

    public refresh() {
      this._onDidChangeTreeData.fire();
    }

    private saveClasses() {
      if(this.timeO) {
        clearTimeout(this.timeO);
      }
      this.timeO = setTimeout(() => { this.doSaveClasses(); }, 1500);
    }

    private doSaveClasses() {
      return window.forceCode.dxCommands.saveToFile(JSON.stringify(this.getWsMembers()), 'wsMembers.json').then(() => {
        console.log('Updated wsMembers.json file');
        return Promise.resolve();
      });
    }
  
    public addClass(wsMember: IWorkspaceMember) {
      const index: number = this.classes.findIndex(curClass => { return curClass.getWsMember().path === wsMember.path });
      if(index !== -1) {
        this.classes[index].setWsMember(wsMember);
      } else {
        var newClass: FCFile = new FCFile(wsMember.name, TreeItemCollapsibleState.None, this, wsMember);
        this.classes.push(newClass);
      }
      this.refresh();
      this.saveClasses();
    }

    public findByNameAndType(name: string, type: string): FCFile {
      if(window.forceCode.dxCommands.isEmptyUndOrNull(this.classes)) {
        return undefined;
      }
      return this.classes.find(cur => {
        const wsMem: IWorkspaceMember = cur.getWsMember();
        return wsMem && wsMem.name === name && wsMem.type === type;
      });
    }

    public findByPath(pa: string): FCFile {
      if(window.forceCode.dxCommands.isEmptyUndOrNull(this.classes)) {
        return undefined;
      }
      return this.classes.find(cur => {
        const wsMem: IWorkspaceMember = cur.getWsMember();
        return wsMem && wsMem.path === pa;
      });
    }

    public findById(id: string): FCFile {
      if(window.forceCode.dxCommands.isEmptyUndOrNull(this.classes)) {
        return undefined;
      }
      return this.classes.find(cur => {
        const wsMem: IWorkspaceMember = cur.getWsMember();
        return wsMem && wsMem.id === id;
      });
    }
  
    public removeClass(fcfile: FCFile): boolean {
      const index = this.classes.indexOf(fcfile);
      if (index !== -1) {
        this.classes.splice(index, 1);
        this.refresh();
        this.saveClasses();
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
        Object.keys(ClassType).forEach(val => {
          if(val !== ClassType.NoShow) {
            var newFCFile: FCFile = new FCFile(ClassType[val], TreeItemCollapsibleState.Collapsed, this);
            newFCFile.setType(ClassType[val]);
            fcFiles.push(newFCFile);
          }
        });
        fcFiles.sort(this.sortFunc);

        return fcFiles;
      } else if(!element.getWsMember()) {
        this.classes.sort(this.sortFunc);
        return this.classes.filter(res => {
          return res.getType() === element.getType();
        });
      }
  
      return [];
    }
  
    public getParent(element: FCFile): any {
      //if(element.getWsMember().id) {  // there's a bug in vscode, so for future use
      //  return this.findByPath(path.sep + element.getType());
      //}
      return null;    // this is the parent
    }

    private sortFunc(a: FCFile, b: FCFile): number {
        var aStr = a.label.split('% ').pop().toUpperCase();
        var bStr = b.label.split('% ').pop().toUpperCase();
        return aStr.localeCompare(bStr);
    }

    private getWsMembers(): IWorkspaceMember[] {
      var wsMembers: IWorkspaceMember[] = new Array<IWorkspaceMember>();
      this.classes.forEach(cur => {
        const withoutCoverage: IWorkspaceMember = Object.assign({}, cur.getWsMember(), {coverage: undefined});
        wsMembers.push(withoutCoverage);
      });
      return wsMembers;
    }
  }
  
  export class FCFile extends TreeItem {
    public readonly collapsibleState: TreeItemCollapsibleState;
    public command: Command;

    private parent: CodeCovViewService;
    private wsMember: IWorkspaceMember;
    private type: string;
  
    constructor(name: string, collapsibleState: TreeItemCollapsibleState, parent: CodeCovViewService, wsMember?: IWorkspaceMember) {
      super(
        name,
        collapsibleState
      );
  
      this.collapsibleState = collapsibleState;
      this.parent = parent;
      this.setWsMember(wsMember);
    }

    public setWsMember(newMem: IWorkspaceMember) {
      this.wsMember = newMem;

      // we only want classes and triggers
      if(!this.wsMember || (this.wsMember.type !== 'ApexClass' && this.wsMember.type !== 'ApexTrigger')) {
        this.type = ClassType.NoShow;
        return undefined;
      }

      super.label = this.wsMember.path.split(path.sep).pop();

      this.command = {
          command: 'ForceCode.openOnClick',
          title: '',
          arguments: [this.wsMember.path]
      }

      this.type = ClassType.UncoveredClass;
      if(this.wsMember.coverage) {
        var fileCoverage: ICodeCoverage = this.wsMember.coverage;
        var total: number = fileCoverage.NumLinesCovered + fileCoverage.NumLinesUncovered;
        var percent = Math.floor((fileCoverage.NumLinesCovered / total) * 100);
        this.label = percent + '% ' + this.label;
        if(percent >= 75) {
            this.type = ClassType.CoveredClass;
        } 
        // this next check needs changed to something different, as there are problems reading the file
      } else {
        var testFile: boolean = false;
        try {
          testFile = fs.readFileSync(this.wsMember.path).toString().toLowerCase().includes('@istest');
        } catch(e) {}
        if(testFile) {
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
      if(!this.wsMember.lastModifiedDate) {
        return true;
      }
      var serverSplit: string[] = serverDate.split('.');
      var localSplit: string[] = this.wsMember.lastModifiedDate.split('.');
      var serverMS: number = (new Date(serverSplit[0])).getTime() + parseInt(serverSplit[1].substring(0, 3));
      var localMS: number = (new Date(localSplit[0])).getTime() + parseInt(localSplit[1].substring(0, 3));

      if(serverMS - localMS <= constants.MAX_TIME_BETWEEN_FILE_CHANGES) {
          return true;
      }
      
      console.log("Time difference between file changes: " + (serverMS - localMS));
      return false;
    }
  }