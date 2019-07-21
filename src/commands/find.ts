import * as vscode from 'vscode';
import { ForcecodeCommand } from './forcecodeCommand';
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

  public command(context: any, selectedResource: any): any {
    // need to ask for a search string then pass off to open

    let options: vscode.InputBoxOptions = {
      placeHolder: 'Enter Search String',
      prompt: `Enter text to search for in a file`,
    };
    return vscode.window.showInputBox(options).then(searchString => {
      if (!searchString) {
        return;
      }
      return vscode.window.forceCode.conn.search(
        'FIND {*' +
          searchString +
          '*} IN ALL FIELDS RETURNING ApexClass(Id, Name, NamespacePrefix), ' +
          'ApexTrigger(Id, Name, NamespacePrefix), ApexPage(Id, Name, NamespacePrefix), ApexComponent(Id, Name, NamespacePrefix), ' +
          'StaticResource(Id, Name, NamespacePrefix, ContentType)',
        function(err, searchResult) {
          notifications.showStatus('ForceCode: Search complete');
          if (err) {
            notifications.showError(err.message);
            return;
          }
          var resArray: any[] = new Array();
          resArray.push({ records: searchResult.searchRecords });

          return vscode.commands.executeCommand('ForceCode.showFileOptions', resArray);
        }
      );
    });
  }
}
