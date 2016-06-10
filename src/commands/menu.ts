import * as vscode from 'vscode';
import {IForceService} from './../forceCode';
import * as commands from './../commands';
import {constants} from './../services';
import model from './../models/commands';
import {getIcon} from './../parsers';
var service: IForceService;


export default function showMenu(context: vscode.ExtensionContext) {
    'use strict';
    vscode.window.setStatusBarMessage('ForceCode Menu');
    service = <IForceService>context.workspaceState.get(constants.FORCE_SERVICE);
    return service.connect(context)
        .then(svc => displayMenu())
        .then(res => processResult(res))
        .then(finished, onError);
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================

    function displayMenu() {
        var quickpick: any[] = [model.enterCredentials];
        if (service.userInfo !== undefined) {
            quickpick.push(model.openFile);
            quickpick.push(model.compileDeploy);
            quickpick.push(model.executeAnonymous);
            quickpick.push(model.getLogs);
            quickpick.push(model.resourceBundle);
            quickpick.push(model.retrievePackage);
            quickpick.push(model.deployPackage);
        }
        let options: vscode.QuickPickItem[] = quickpick.map(record => {
            let icon: string = getIcon(record.icon);
            return {
                description: `${record.description}`,
                detail: `${record.detail}`,
                label: `$(${icon}) ${record.label}`,
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
                    return commands.credentials(context);
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
                    return commands.retrieve();
                case model.deployPackage.description:
                    // return commands.deployPackage();
                    break;
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
    function onError(err): boolean {
        vscode.window.setStatusBarMessage('Error opening menu');
        vscode.window.showErrorMessage(err.message);
        var outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('ForceCode');
        outputChannel.append('================================================================');
        outputChannel.append(err);
        console.log(err);
        return false;
    }
    // =======================================================================================================================================
}
