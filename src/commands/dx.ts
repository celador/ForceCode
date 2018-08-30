import * as vscode from 'vscode';
var alm: any = require('salesforce-alm');

export default function runDX() {
    var theCmd: any = undefined;

    return showFileOptions()
        .then(getArgsAndRun)
        .then(showMessage, showMessage);

    // =======================================================================================================================================
    function showFileOptions(): Thenable<vscode.QuickPickItem> {
        let options: vscode.QuickPickItem[] = alm.commands.filter(c => {
            return !c.hidden;
        }).map(c => {
            return {
                label: c.topic + ':' + c.command,
                description: c.longDescription,
                detail: c.usage
            };
        });
        let config: {} = {
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: 'DX Commands',
        };
        return vscode.window.showQuickPick(options, config);
    }

    function getArgsAndRun(opt: vscode.QuickPickItem): Thenable<string[]> {
        if(opt === undefined) {
            return undefined;
        }
        theCmd = vscode.window.forceCode.dxCommands.getCommand(opt.label);
        
        let options: vscode.InputBoxOptions = {
            ignoreFocusOut: true,
            value: '',
            placeHolder: 'enter the arguements for this dx function',
            prompt: theCmd.usage,
        };
        // this needs to wait for this input to get done somehow!!!
        return vscode.window.showInputBox(options).then(function (result: string) {
            if(result != undefined) {
                vscode.window.forceCode.outputChannel.clear();
                vscode.window.forceCode.outputChannel.show();
                try{
                    return vscode.window.forceCode.dxCommands.runCommand(opt.label, result);
                } catch(e) {
                    return ['Error running dx command:' + e];
                }
            }
            return result;
        });
    }

    function showMessage(message) {
        vscode.window.forceCode.outputChannel.show();
        vscode.window.forceCode.outputChannel.appendLine(vscode.window.forceCode.dxCommands.outputToString(message));
        vscode.window.forceCode.showStatus('ForceCode: DX Command execution complete!');
    }
}