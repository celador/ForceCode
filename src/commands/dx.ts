import * as vscode from 'vscode';
import * as error from './../util/error';
import * as dx from '../services/runDXCmd';
var alm: any = require('salesforce-alm');

export default function open(context: vscode.ExtensionContext) {
    var theCmd: any = undefined;
    vscode.window.forceCode.statusBarItem.text = 'DX Menu';
    vscode.window.forceCode.resetMenu();

    return vscode.window.forceCode.connect(context)
        .then(svc => showFileOptions())
        .then(getArgsAndRun)
        .then(out => vscode.window.forceCode.outputChannel.appendLine(dx.outputToString(out)))
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));
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
        theCmd = dx.getCommand(opt.label);
        
        let options: vscode.InputBoxOptions = {
            ignoreFocusOut: true,
            value: '',
            placeHolder: 'enter the arguements for this dx function',
            prompt: theCmd.usage,
        };
        // this needs to wait for this input to get done somehow!!!
        return vscode.window.showInputBox(options).then(function (result: string) {
            if(result != undefined && result != '') {
                vscode.window.forceCode.outputChannel.clear();
                vscode.window.forceCode.outputChannel.show();
                try{
                    return dx.runCommand(opt.label, result);
                } catch(e) {
                    return ['Error running dx command:' + e];
                }
            }
        });
    }

    // =======================================================================================================================================
}