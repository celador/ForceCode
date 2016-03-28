import * as vscode from 'vscode';
import {IForceService} from './../forceCode';
import fs = require('fs-extra');
import {getIcon, getExtension, getFolder} from './../parsers';
const TYPEATTRIBUTE: string = 'type';
var service: IForceService;

export default function open() {
    'use strict';
    vscode.window.setStatusBarMessage('open Started');
    service = vscode.window.forceCode;

    return service.connect()
        .then(svc => showFileOptions())
        .then(opt => getFile(opt))
        .then(finished, onError);
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function showFileOptions() {
        var promises: Thenable<any>[] = [
            service.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexClass'),
            service.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexTrigger'),
            service.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexPage'),
            service.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexComponent'),
        ];
        // TODO: Objects
        // TODO: Static Resources
        // TODO: Packages
        return Promise.all(promises).then(results => {
            let options: vscode.QuickPickItem[] = results
                .map(res => res.records)
                .reduce((prev, curr) => {
                    return prev.concat(curr);
                })
                .map(record => {
                    let icon: string = getIcon(record.attributes[TYPEATTRIBUTE]);
                    return {
                        description: `${record.Id}`,
                        detail: `${record.attributes[TYPEATTRIBUTE]}`,
                        label: `$(${icon}) ${record.Name}`,
                    };
                });
            let config: {} = {
                matchOnDescription: true,
                matchOnDetail: true,
                placeHolder: 'Retrieve a Salesforce File',
            };
            return vscode.window.showQuickPick(options, config);
        });
    }

    // =======================================================================================================================================
    function getFile(res: any) {
        return service.conn.tooling.sobject(res.detail)
            .find({ Id: res.description }).execute();
    }
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function finished(res): boolean {
        if (res[0] !== undefined) {
            let toolingType: string = res[0].attributes[TYPEATTRIBUTE];
            let filename: string = `${vscode.workspace.rootPath}/src/${getFolder(toolingType)}/${res[0].FullName || res[0].Name}.${getExtension(toolingType)}`;
            let body: string = res[0].Body || res[0].Markup;

            fs.outputFile(filename, body, function(err) {
                console.log(err);
                vscode.workspace.openTextDocument(filename).then(doc => vscode.window.showTextDocument(doc, 3));
                // vscode.window.showInformationMessage('Finished');
            });
        }
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
