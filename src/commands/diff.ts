import * as vscode from 'vscode';
import * as parsers from './../parsers';

const PROVIDER: string = 'forcecode://salesforce.com';

export default function diff(document: vscode.TextDocument, context: vscode.ExtensionContext) {
    if(!document) {
        return;
    }
    const toolingType: string = parsers.getToolingType(document);
    const fileName: string = parsers.getWholeFileName(document);
    try{
        diffFile()
    } catch(err) {
        vscode.window.showErrorMessage(err.message);
    } 
    return;
    // .then(finished)
    // =======================================================================================================================================
    // =======================================================================================================================================
    function diffFile() {
        var command: Thenable<{}> = vscode.commands.executeCommand('vscode.diff', buildSalesforceUriFromLocalUri(document.uri), document.uri, `${fileName} (REMOTE) <~> ${fileName} (LOCAL)`, { preview: false });
        return command;
    }

    function buildSalesforceUriFromLocalUri(uri: vscode.Uri): vscode.Uri {
        var sfuri: vscode.Uri = vscode.Uri.parse(`${PROVIDER}/${toolingType}/${fileName}?${Date.now()}`);
        return sfuri;
    }
    // =======================================================================================================================================

    // =======================================================================================================================================

}



