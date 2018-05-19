import * as vscode from 'vscode';

export default function dxLogout(): Promise<any> {
    try {
        return vscode.window.forceCode.dxCommands.logout().then(() => {
            vscode.window.forceCode.conn = undefined;   // this will go away soon
            vscode.window.forceCode.statusBarItem.hide();
            vscode.window.forceCode.statusBarItem_UserInfo.hide();
            return Promise.resolve();
        });   
    } catch(e) {
        return Promise.reject(vscode.window.showErrorMessage(e.message));
    }
    // =======================================================================================================================================
}