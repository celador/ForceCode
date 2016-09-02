import * as vscode from 'vscode';
import * as commands from './../commands';
import model from './../models/commands';
import * as error from './../util/error';

export default function showMenu(context: vscode.ExtensionContext) {
    'use strict';
    vscode.window.setStatusBarMessage('ForceCode Menu');

    return vscode.window.forceCode.connect(context)
        .then(svc => displayMenu())
        .then(res => processResult(res))
        .then(finished)
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================

    function displayMenu() {
        var quickpick: any[] = [model.enterCredentials];
        if (vscode.window.forceCode.userInfo !== undefined) {
            quickpick.push(model.openFile);
            quickpick.push(model.compileDeploy);
            quickpick.push(model.executeAnonymous);
            quickpick.push(model.getLogs);
            quickpick.push(model.resourceBundle);
            quickpick.push(model.retrievePackage);
            // quickpick.push(model.deployPackage);
            quickpick.push(model.createClass);

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
            switch (result.description) {
                case model.enterCredentials.description:
                    return commands.credentials();
                case model.compileDeploy.description:
                    return commands.compile(vscode.window.activeTextEditor.document, context);
                case model.executeAnonymous.description:
                    return commands.executeAnonymous(vscode.window.activeTextEditor.document, context);
                case model.getLogs.description:
                    return commands.getLog(context);
                case model.openFile.description:
                    return commands.open(context);
                case model.resourceBundle.description:
                    return commands.staticResource(context);
                case model.retrievePackage.description:
                    return commands.retrieve(context);
                case model.deployPackage.description:
                    // return commands.deployPackage();
                    break;
                case model.createClass.description:
                    return commands.createClass(context);
                default:
                    break;
            }
        }
    }
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function finished(res): boolean {
        console.log(res);
        return true;
    }
    // =======================================================================================================================================
    // function onError(err): boolean {
    //     vscode.window.setStatusBarMessage('Error opening menu');
    //     vscode.window.showErrorMessage(err.message);
    //     var outputChannel: vscode.OutputChannel = vscode.window.forceCode.outputChannel;
    //     outputChannel.appendLine('================================================================');
    //     outputChannel.appendLine(err);
    //     console.error(err);
    //     return false;
    // }
    // =======================================================================================================================================
}
