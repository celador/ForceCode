import * as vscode from 'vscode';
import { commandService } from '../services';

export default function find() {
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
        vscode.window.forceCode.showStatus('ForceCode: Search complete');
        if (err) {
          vscode.window.showErrorMessage(err.message);
          return;
        }
        var resArray: any[] = new Array();
        resArray.push({ records: searchResult.searchRecords });

        return commandService.runCommand('ForceCode.showFileOptions', resArray);
      }
    );
  });
}
