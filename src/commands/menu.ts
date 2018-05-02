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
            quickpick.push(model.find);
            quickpick.push(model.openFile);
            quickpick.push(model.createClass);
            quickpick.push(model.executeAnonymous);
            quickpick.push(model.getLogs);
            quickpick.push(model.getCodeCoverage);
            quickpick.push(model.getOverallCoverage);
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
                case model.openOrg.description: return vscode.window.forceCode.dxCommands.openOrg();
                case model.enterCredentials.description: return commands.credentials();
                case model.compileDeploy.description: return commands.compile(vscode.window.activeTextEditor.document, context);
                case model.executeAnonymous.description: return commands.executeAnonymous(vscode.window.activeTextEditor.document, context);
                case model.getLogs.description: return commands.getLog(context);
                case model.openFile.description: return commands.open(context);
                case model.resourceBundle.description: return commands.staticResource(context);
                case model.retrievePackage.description: return commands.retrieve(context);
                case model.soql.description: return commands.soql();
                case model.toql.description: return commands.toql();
                case model.deployPackage.description: return commands.deploy(context);
                case model.diff.description: return commands.diff(vscode.window.activeTextEditor.document, context);
                case model.createClass.description: return commands.createClass(context);
                case model.dx.description: return commands.dx();
                case model.dxLogout.description: return commands.dxLogout();
                case model.codeCompletionRefresh.description: return commands.codeCompletionRefresh();
                case model.getCodeCoverage.description: return commands.apexTestResults();
                case model.find.description: return commands.find();
                case model.getOverallCoverage.description: return commands.getOverallCoverage();
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
