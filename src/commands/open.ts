import * as vscode from 'vscode';
import {IForceService} from './../services';

export default function open(force: IForceService) {
    'use strict';
    vscode.window.setStatusBarMessage('open Started');
    var name: string = undefined;
    return force.connect()
        .then(svc => showFileOptions(svc))
        .then(opt => getFile(opt))
        .then(finished, onError);
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function showFileOptions(service: IForceService) {
        var promises: Thenable<any>[] = [
            service.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexClass'),
            service.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexTrigger'),
            service.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexPage'),
            service.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexComponent')
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
                    let icon = getIcon(record.attributes['type']);
                    // let extension = getExtension(record.attributes['type']);
                    return {
                        label: `$(${icon}) ${record.Name}`,
                        description: `${record.Id}`,
                        detail: `${record.attributes['type']}`,
                    };
                });
            let config = {
                matchOnDescription: true,
                matchOnDetail: true,
                placeHolder: 'Retrieve a Salesforce File'
            };
            return vscode.window.showQuickPick(options, config);
        });
    }
    // =======================================================================================================================================
    function getIcon(toolingType: string) {
        switch (toolingType) {
            case 'ApexClass':
                return 'file-text';
            case 'ApexPage':
                return 'code';
            case 'ApexTrigger':
                return 'zap';
            case 'ApexComponent':
                return 'gist';
            case 'ApexLog':
                return 'bug';
            default:
                return 'file-text';
        }
    }
    // =======================================================================================================================================
    function getExtension(toolingType: string) {
        switch (toolingType) {
            case 'ApexClass':
                return 'cls';
            case 'ApexPage':
                return 'page';
            case 'ApexTrigger':
                return 'trigger';
            case 'ApexComponent':
                return 'component';
            case 'ApexLog':
                return 'log';
            default:
                return 'cls';
        }
    }
    // =======================================================================================================================================
    function getFolder(toolingType: string) {
        switch (toolingType) {
            case 'ApexClass':
                return 'classes';
            case 'ApexPage':
                return 'pages';
            case 'ApexTrigger':
                return 'triggers';
            case 'ApexComponent':
                return 'components';
            case 'ApexLog':
                return 'logs';
            default:
                return 'classes';
        }
    }
    // =======================================================================================================================================
    function getFile(res: any) {
        return force.conn.tooling.sobject(res.detail)
            .find({ Id: res.description }).execute();
    }
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function finished(res): boolean {
        if (res[0] !== undefined) {
            let toolingType = res[0].attributes['type'];
            let filename = `${vscode.workspace.rootPath}/src/${getFolder(toolingType)}/${res[0].FullName || res[0].Name}.${getExtension(toolingType)}`;
            let body = res[0].Body || res[0].Markup;
            var fs = require('node-fs-extra');

            fs.outputFile(filename, body, function(err) {
                console.log(err);
                vscode.workspace.openTextDocument(filename).then(doc => vscode.window.showTextDocument(doc, 3));
                // vscode.window.showInformationMessage('Finished');
            });
        } return true;
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
