import * as vscode from 'vscode';
import { ForcecodeCommand } from '.';
import { notifications } from '../services';

export class Find extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.find';
    this.name = 'Finding in files';
    this.hidden = false;
    this.description = 'Find in files';
    this.detail = 'Search salesforce source files for a string.';
    this.icon = 'search';
    this.label = 'Find';
  }

  public command(): any {
    const editor = vscode.window.activeTextEditor;
    let document: vscode.TextDocument | undefined = editor?.document;
    let selection = editor?.selection;
    let text = document?.getText(selection);
    if (text) {
      return this.search(text);
    }
    // need to ask for a search string then pass off to open

    let options: vscode.InputBoxOptions = {
      placeHolder: 'Enter Search String',
      prompt: `Enter text to search for in a file`,
    };
    return vscode.window.showInputBox(options).then((searchString) => {
      if (!searchString) {
        return;
      }
      return this.search(searchString);
    });
  }

  private search(searchString: string) {
    return vscode.window.forceCode.conn.search(
      'FIND {*' +
        searchString +
        '*} IN ALL FIELDS RETURNING ApexClass(Id, Name, NamespacePrefix), ' +
        'ApexTrigger(Id, Name, NamespacePrefix), ApexPage(Id, Name, NamespacePrefix), ApexComponent(Id, Name, NamespacePrefix), ' +
        'StaticResource(Id, Name, NamespacePrefix, ContentType)',
      function (err, searchResult) {
        notifications.showStatus('ForceCode: Search complete');
        if (err) {
          notifications.showError(err.message);
          return;
        }
        let resArray: any[] = [];
        resArray.push({ records: searchResult.searchRecords });

        return vscode.commands.executeCommand('ForceCode.showFileOptions', resArray);
      }
    );
  }
}
