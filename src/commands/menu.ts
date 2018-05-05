import * as vscode from 'vscode';
import model from './../models/commands';

export default function showMenu(context: vscode.ExtensionContext) {
    var quickpick: any[] = [];
    return vscode.window.forceCode.connect(context)
        .then(svc => displayMenu())
        .then(res => processResult(res))
        .then(finished)
        .catch(err => vscode.window.showErrorMessage(err.message));
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================

    function displayMenu() {
        if (vscode.window.forceCode.dxCommands.isLoggedIn) {
            model.forEach(cur => {
                if(!cur.hidden) {
                    quickpick.push(cur);
                }
            });
        } else {
            quickpick.push(model.find(cur => { return cur.commandName === 'ForceCode.enterCredentials'; }));
        }
        
        let options: vscode.QuickPickItem[] = quickpick.map(record => {
            return {
                description: `${record.description}`,
                detail: `${record.detail}`,
                label: `$(${record.icon}) ${record.label}`,
            };
        });
        let config: {} = {
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: 'Run a command',
        };
        return vscode.window.showQuickPick(options, config);
    }
    function processResult(result) {
        if (result !== undefined && result.description !== undefined) {
            return vscode.window.forceCode.runCommand(
                quickpick.find(cur => { return result.description === cur.description; }).commandName, context);
        }
    }
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function finished(res): boolean {
        return true;
    }
    // =======================================================================================================================================
}
