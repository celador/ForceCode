import * as vscode from 'vscode';
import * as error from './../util/error';
import * as dx from '../services/runDXCmd';

export default async function dxLogout(context: vscode.ExtensionContext): Promise<any> {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Logging out of DX';
    try {
        await dx.runCommand('auth:logout', '--targetusername ' + vscode.window.forceCode.config.username + ' --noprompt');
        vscode.window.forceCode.statusBarItem.text = 'ForceCode: Logout complete!!!';
        vscode.window.forceCode.resetMenu();
        return Promise.resolve();
    } catch(e) {
        return Promise.reject(error.outputError(e, vscode.window.forceCode.outputChannel));
    }
    // =======================================================================================================================================
}