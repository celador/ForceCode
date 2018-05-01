import * as vscode from 'vscode';
import { showFileOptions } from './open';

export default function find() {
    // need to ask for a search string then pass off to open
    //...get string here....
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Search in files';

    let options: vscode.InputBoxOptions = {
        placeHolder: 'Enter Search String',
        prompt: `Enter text to search for in a file`,
    };
    return vscode.window.showInputBox(options).then(searchString => {
        return vscode.window.forceCode.conn.search("FIND {*" + searchString + "*} IN ALL FIELDS RETURNING ApexClass(Id, Name, NamespacePrefix), "
            + "ApexTrigger(Id, Name, NamespacePrefix), ApexPage(Id, Name, NamespacePrefix), ApexComponent(Id, Name, NamespacePrefix), "
            + "StaticResource(Id, Name, NamespacePrefix, ContentType)", function(err, searchResult) {
                vscode.window.forceCode.statusBarItem.text = 'ForceCode: Search complete';
                vscode.window.forceCode.resetMenu();
                if(err) {
                    vscode.window.forceCode.outputError({message: err}, vscode.window.forceCode.outputChannel);
                    return;
                }
                var resArray: any[] = new Array();
                resArray.push({records: searchResult.searchRecords});

                return showFileOptions(resArray);
        });
    });
}