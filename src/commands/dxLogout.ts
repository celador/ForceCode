import * as vscode from 'vscode';
import * as error from './../util/error';
import * as dx from '../services/runDXCmd';

export default async function dxLogout(context: vscode.ExtensionContext): Promise<any> {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Logging out of DX';
    try {
        var alm = require('salesforce-alm');
        var theCmd: dx.Command = alm.commands.filter(c => {
            return (c.topic + ':' + c.command) === 'auth:logout';
        })[0];
        await dx.runCommand(theCmd, '--targetusername ' + vscode.window.forceCode.config.username + ' --noprompt');
        vscode.window.forceCode.statusBarItem.text = 'ForceCode: Logout complete!!!';
        vscode.window.forceCode.resetMenu();
        return Promise.resolve();
    } catch(e) {
        return Promise.reject(error.outputError(e, vscode.window.forceCode.outputChannel));
    }
    // =======================================================================================================================================
}