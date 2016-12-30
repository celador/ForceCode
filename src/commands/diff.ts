import * as vscode from 'vscode';
import * as parsers from './../parsers';
import * as error from './../util/error';

const PROVIDER: string = 'forcecode://salesforce.com';

export default function diff(document: vscode.TextDocument, context: vscode.ExtensionContext) {
    const toolingType: string = parsers.getToolingType(document);
    const fileName: string = parsers.getWholeFileName(document);
    // vscode.window.forceCode.statusBarItem.text = 'ForceCode: Diffing';
    return vscode.window.forceCode.connect(context)
        .then(diffFile)
        .catch(err => error.outputError({ message: err.toString() }, vscode.window.forceCode.outputChannel));
    // .then(finished)
    // =======================================================================================================================================
    // =======================================================================================================================================
    function diffFile() {
        var command: Thenable<{}> = vscode.commands.executeCommand('vscode.diff', buildSalesforceUriFromLocalUri(document.uri), document.uri, `${fileName} (REMOTE) <~> ${fileName} (LOCAL)`);
        return command;
    }

    function buildSalesforceUriFromLocalUri(uri: vscode.Uri): vscode.Uri {
        var sfuri: vscode.Uri = vscode.Uri.parse(`${PROVIDER}/${toolingType}/${fileName}?${Date.now()}`);
        return sfuri;
    }
    // =======================================================================================================================================

    // =======================================================================================================================================

}



