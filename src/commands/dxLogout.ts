import * as vscode from 'vscode';
import * as error from './../util/error';

export default async function dxLogout(context: vscode.ExtensionContext): Promise<any> {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Logging out of DX';
    try {
        await vscode.window.forceCode.dxCommands.logout();
        vscode.window.forceCode.statusBarItem.text = 'ForceCode: Logout complete!!!';
        vscode.window.forceCode.resetMenu();
        return Promise.resolve();
    } catch(e) {
        return Promise.reject(error.outputError(e, vscode.window.forceCode.outputChannel));
    }
    // =======================================================================================================================================
}