import * as vscode from 'vscode';
import * as error from './../util/error';
import * as dx from '../services/runDXCmd';

export default async function dxLogin(context: vscode.ExtensionContext): Promise<any> {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Logging into DX';
    try {
        await dx.runCommand('auth:web:login', '--instanceurl ' + vscode.window.forceCode.config.url + ' --setdefaultusername');
        vscode.window.forceCode.statusBarItem.text = 'ForceCode: Login complete!!!';
        vscode.window.forceCode.resetMenu();
        return Promise.resolve();
    } catch(e) {
        return Promise.reject(error.outputError(e, vscode.window.forceCode.outputChannel));
    }
    // =======================================================================================================================================
}