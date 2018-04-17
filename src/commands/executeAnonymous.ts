import * as vscode from 'vscode';

export default function executeAnonymous(document: vscode.TextDocument, context: vscode.ExtensionContext): any {
    const editor = vscode.window.activeTextEditor;
    var selection = editor.selection;
    var text = editor.document.getText(selection);
    if(text === '')
    {
        vscode.window.forceCode.statusBarItem.text = 'No text selected to execute, please select code to run...';
        vscode.window.forceCode.resetMenu();
        return;
    }

    // we need to put the selected text in a temp file and then send it off to sfdx to run
    return vscode.window.forceCode.dxCommands.saveToFile(text, 'execAnon.tmp').then(path => {
        return vscode.window.forceCode.dxCommands.execAnon(path).then(res => {
            vscode.window.forceCode.outputChannel.clear();
            vscode.window.forceCode.outputChannel.appendLine(vscode.window.forceCode.dxCommands.filterLog(res));
            vscode.window.forceCode.outputChannel.show();
            return vscode.window.forceCode.dxCommands.removeFile('execAnon.tmp');
        });
    });
}
