import * as vscode from 'vscode';
import * as path from 'path';
import { getVSCodeSetting } from '.';
import { VSCODE_SETTINGS } from './configuration';

interface ISaveResult {
  fileName: string;
  path: string;
  success: boolean;
  messages: string[];
}

export class SaveHistoryService implements vscode.TreeDataProvider<SaveResult> {
  private static instance: SaveHistoryService;
  private readonly saveResults: SaveResult[];
  private _onDidChangeTreeData: vscode.EventEmitter<SaveResult | undefined> =
    new vscode.EventEmitter<SaveResult | undefined>();

  public readonly onDidChangeTreeData: vscode.Event<SaveResult | undefined> =
    this._onDidChangeTreeData.event;

  private constructor() {
    this.saveResults = [];
  }

  public static getInstance(): SaveHistoryService {
    if (!SaveHistoryService.instance) {
      SaveHistoryService.instance = new SaveHistoryService();
    }
    return SaveHistoryService.instance;
  }

  public addSaveResult(result: ISaveResult): void {
    this.saveResults.unshift(new SaveResult(result));
    if (this.saveResults.length > getVSCodeSetting(VSCODE_SETTINGS.maxSaveHistory)) {
      this.saveResults.pop();
    }
    vscode.window.forceCode.lastSaveResult = this.saveResults[0];
    this._onDidChangeTreeData.fire(undefined);
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

  public getParent(_element: SaveResult): null {
    return null; // this is the parent
  }
}

export class SaveResult extends vscode.TreeItem {
  public readonly result: ISaveResult;

  constructor(result: ISaveResult) {
    super(
      result.fileName + ' - ' + new Date().toLocaleTimeString(),
      vscode.TreeItemCollapsibleState.None
    );

    this.result = result;
    const imagePath: string = path.join(vscode.window.forceCode.storageRoot, 'images');
    this.iconPath = {
      dark: path.join(imagePath, this.result.success ? 'greenCheck.svg' : 'redEx.svg'),
      light: path.join(imagePath, this.result.success ? 'greenCheck.svg' : 'redEx.svg'),
    };
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
