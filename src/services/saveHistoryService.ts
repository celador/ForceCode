import * as vscode from 'vscode';
import * as path from 'path';

interface ISaveResult {
  fileName: string;
  path: string;
  success: boolean;
  messages: string[];
}

export class SaveHistoryService implements vscode.TreeDataProvider<SaveResult> {
  private static instance: SaveHistoryService;
  private readonly saveResults: SaveResult[];
  private _onDidChangeTreeData: vscode.EventEmitter<
    SaveResult | undefined
  > = new vscode.EventEmitter<SaveResult | undefined>();

  public readonly onDidChangeTreeData: vscode.Event<SaveResult | undefined> = this
    ._onDidChangeTreeData.event;

  public constructor() {
    this.saveResults = [];
  }

  public static getInstance() {
    if (!SaveHistoryService.instance) {
      SaveHistoryService.instance = new SaveHistoryService();
    }
    return SaveHistoryService.instance;
  }

  public addSaveResult(result: ISaveResult) {
    this.saveResults.unshift(new SaveResult(result));
    if (this.saveResults.length > vscode.workspace.getConfiguration('force')['maxSaveHistory']) {
      this.saveResults.pop();
    }
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: SaveResult): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: SaveResult): SaveResult[] {
    if (!element) {
      // This is the root node
      return this.saveResults;
    }

    return [];
  }

  public getParent(element: SaveResult): any {
    return null; // this is the parent
  }
}

export class SaveResult extends vscode.TreeItem {
  private readonly result: ISaveResult;

  constructor(result: ISaveResult) {
    super(
      result.fileName + ' - ' + new Date().toLocaleTimeString(),
      vscode.TreeItemCollapsibleState.None
    );

    this.result = result;
    const imagePath: string = path.join(vscode.window.forceCode.storageRoot, 'images');
    if (this.result.success) {
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
    this.tooltip = this.result.success
      ? 'SUCCESS! - ' + new Date().toLocaleTimeString()
      : 'FAILED:\n' + this.result.messages.join('\n');
    this.command = {
      command: 'ForceCode.openOnClick',
      title: '',
      arguments: [this.result.path],
    };
  }
}
