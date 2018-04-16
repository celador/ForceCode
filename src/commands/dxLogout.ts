import * as vscode from 'vscode';

export default function dxLogout(): Promise<any> {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Logging out of DX';
    try {
        return vscode.window.forceCode.dxCommands.logout().then(val => {
            vscode.window.forceCode.conn = undefined;
            vscode.window.forceCode.userInfo = undefined;
            vscode.window.forceCode.statusBarItem.hide();
            vscode.window.forceCode.statusBarItem_UserInfo.hide();
            vscode.window.forceCode.resetMenu();
            return Promise.resolve();
        });   
    } catch(e) {
        return Promise.reject(vscode.window.forceCode.outputError(e, vscode.window.forceCode.outputChannel));
    }
    // =======================================================================================================================================
}