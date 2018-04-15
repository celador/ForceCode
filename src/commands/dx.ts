import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
var alm: any = require('salesforce-alm');

export default function runDX() {
    var theCmd: any = undefined;
    vscode.window.forceCode.statusBarItem.text = 'DX Menu';

    return showFileOptions()
        .then(getArgsAndRun)
        .then(out => {
            if(out !== undefined) {
                vscode.window.forceCode.outputChannel.appendLine(vscode.window.forceCode.dxCommands.outputToString(out));
            } else {
                return undefined;
            }
            return out;
        })
        .then(out => {
            if(out !== undefined) {
                showLogFile();
            } else {
                return undefined;
            }
        })
        .then(out => {
            if(out !== undefined) {
                vscode.window.forceCode.statusBarItem.text = 'ForceCode: DX Command execution complete!';
            }
            vscode.window.forceCode.resetMenu();
        })
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
                vscode.window.forceCode.statusBarItem.text = 'ForceCode: Running ' + opt.label + ' ' + result;
                try{
                    return vscode.window.forceCode.dxCommands.runCommand(opt.label, result);
                } catch(e) {
                    return ['Error running dx command:' + e];
                }
            }
        });
    }

    function showLogFile() {
        var p: fs.PathLike = vscode.workspace.rootPath + path.sep + 'dx.log';
        return vscode.workspace.openTextDocument(p).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    }

    // =======================================================================================================================================
}