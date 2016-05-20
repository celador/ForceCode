import * as vscode from 'vscode';
import {IForceService} from './../forceCode';
import {getIcon} from './../parsers';
var service: IForceService;

export default function showMenu() {
    'use strict';
    vscode.window.setStatusBarMessage('ForceCode Menu');
    service = vscode.window.forceCode;
    return service.connect()
        .then(svc => displayMenu())
        .then(finished, onError);
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function displayMenu() {
        // We need to figure out what options we have.
        // Options.. 
        // Execute Anonymous 
        // Execute Selected Code
        // Compile/Deploy
        // Export Package (Deploy via Metadata API, using Package.xml)
        // Retrieve Package
        // Get Log(s)
        // Open File
        // Build/Deploy Resource Bundle(s)
        let options: vscode.QuickPickItem[] = ['Test']
        .map(str => {
            let icon: string = getIcon(str);
            return {
                // description: `${record.Id}`,
                // detail: `${record.attributes[TYPEATTRIBUTE]}`,
                // label: `$(${icon}) ${record.Name}`,
                description: `Description`,
                detail: `Detail`,
                label: `Label`,
            };
        });
        let config: {} = {
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: 'Retrieve a Salesforce File',
        };
        return vscode.window.showQuickPick(options, config);
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
        vscode.window.setStatusBarMessage('open Error');
        var outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('ForceCode');
        outputChannel.append('================================================================');
        outputChannel.append(err);
        console.log(err);
        return false;
    }
    // =======================================================================================================================================
}
