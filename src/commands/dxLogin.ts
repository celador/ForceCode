import * as vscode from 'vscode';
import * as error from './../util/error';

export default async function dxLogin(context: vscode.ExtensionContext): Promise<any> {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Logging into DX';
    try {
        await vscode.window.forceCode.dxCommands.login();
        vscode.window.forceCode.statusBarItem.text = 'ForceCode: Login complete!!!';
        vscode.window.forceCode.resetMenu();
        return Promise.resolve();
    } catch(e) {
        return Promise.reject(error.outputError(e, vscode.window.forceCode.outputChannel));
    }
    // =======================================================================================================================================
}