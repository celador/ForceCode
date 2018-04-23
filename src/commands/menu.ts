import * as vscode from 'vscode';
import * as commands from './../commands';
import model from './../models/commands';

export default function showMenu(context: vscode.ExtensionContext) {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode Menu';
    vscode.window.forceCode.statusBarItem.color = 'white';
    return vscode.window.forceCode.connect(context)
        .then(svc => displayMenu())
        .then(res => processResult(res))
        .then(finished)
        .catch(err => vscode.window.forceCode.outputError(err, vscode.window.forceCode.outputChannel));
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================

    function displayMenu() {
        var quickpick: any[] = [];
        if (vscode.window.forceCode.dxCommands.isLoggedIn) {
            quickpick.push(model.openOrg);
            quickpick.push(model.openFile);
            quickpick.push(model.createClass);
            quickpick.push(model.executeAnonymous);
            quickpick.push(model.getLogs);
            quickpick.push(model.soql);
            quickpick.push(model.diff);
            quickpick.push(model.compileDeploy);
            quickpick.push(model.resourceBundle);
            quickpick.push(model.retrievePackage);
            quickpick.push(model.deployPackage);
            quickpick.push(model.toql);
            quickpick.push(model.dx);
            quickpick.push(model.codeCompletionRefresh);
            quickpick.push(model.dxLogout);
        }
        quickpick.push(model.enterCredentials);
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
            switch (result.description) {
                case model.openOrg.description: return vscode.window.forceCode.checkAndRunCommand(vscode.window.forceCode.dxCommands.openOrg);
                case model.enterCredentials.description: return vscode.window.forceCode.checkAndRunCommand(commands.credentials);
                case model.compileDeploy.description: return vscode.window.forceCode.checkAndRunCommand(commands.compile, vscode.window.activeTextEditor.document, context);
                case model.executeAnonymous.description: return vscode.window.forceCode.checkAndRunCommand(commands.executeAnonymous, vscode.window.activeTextEditor.document, context);
                case model.getLogs.description: return vscode.window.forceCode.checkAndRunCommand(commands.getLog, context);
                case model.openFile.description: return vscode.window.forceCode.checkAndRunCommand(commands.open, context);
                case model.resourceBundle.description: return vscode.window.forceCode.checkAndRunCommand(commands.staticResource, context);
                case model.retrievePackage.description: return vscode.window.forceCode.checkAndRunCommand(commands.retrieve, context);
                case model.soql.description: return vscode.window.forceCode.checkAndRunCommand(commands.soql);
                case model.toql.description: return vscode.window.forceCode.checkAndRunCommand(commands.toql);
                case model.deployPackage.description: return vscode.window.forceCode.checkAndRunCommand(commands.deploy, context);
                case model.diff.description: return vscode.window.forceCode.checkAndRunCommand(commands.diff, vscode.window.activeTextEditor.document, context);
                case model.createClass.description: return vscode.window.forceCode.checkAndRunCommand(commands.createClass, context);
                case model.dx.description: return vscode.window.forceCode.checkAndRunCommand(commands.dx);
                case model.dxLogout.description: return vscode.window.forceCode.checkAndRunCommand(commands.dxLogout);
                case model.codeCompletionRefresh.description: return vscode.window.forceCode.checkAndRunCommand(commands.codeCompletionRefresh);
                default: break;
            }
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
