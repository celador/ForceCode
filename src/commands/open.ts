import * as vscode from 'vscode';
import fs = require('fs-extra');
import {getIcon, getExtension, getFolder} from './../parsers';
const TYPEATTRIBUTE: string = 'type';

export default function open(context: vscode.ExtensionContext) {
    'use strict';
    vscode.window.setStatusBarMessage('open Started');

    return vscode.window.forceCode.connect(context)
        .then(svc => showFileOptions())
        .then(opt => getFile(opt))
        .then(finished, onError);
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function showFileOptions() {
        var promises: any[] = [
            vscode.window.forceCode.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexClass'),
            vscode.window.forceCode.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexTrigger'),
            vscode.window.forceCode.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexPage'),
            vscode.window.forceCode.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexComponent'),
            vscode.window.forceCode.conn.tooling.query('SELECT Id, DeveloperName, NamespacePrefix FROM CustomObject'),
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
                        label: `$(${icon}) ${record.Name || record.DeveloperName}`,
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
        return vscode.window.forceCode.conn.tooling.sobject(res.detail)
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
                console.error(err);
                vscode.workspace.openTextDocument(filename).then(doc => vscode.window.showTextDocument(doc, 3));
                // vscode.window.showInformationMessage('Finished');
            });
        }
        return true;
    }
    // =======================================================================================================================================
    function onError(err): boolean {
        vscode.window.setStatusBarMessage('ForceCode: Error Opening File');
        var outputChannel: vscode.OutputChannel = vscode.window.forceCode.outputChannel;
        outputChannel.appendLine('================================================================');
        outputChannel.appendLine(err);
        console.error(err);
        return false;
    }
    // =======================================================================================================================================
}
