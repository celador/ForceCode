import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import {getIcon} from './../parsers';
import * as error from './../util/error';

export default function enterCredentials() {
    'use strict';
    vscode.window.setStatusBarMessage('ForceCode Menu');

    return getUsername()
        .then(cfg => getPassword(cfg))
        .then(cfg => getUrl(cfg))
        .then(cfg => getAutoCompile(cfg))
        // .then(cfg => setSettings(cfg)):
        .then(cfg => finished(cfg))
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================

    function getYoForceConfig() {
        // return vscode.workspace.findFiles('force.json', '').then(function (files) {
        //   var buffer: NodeBuffer = undefined;
        var forceConfig: any = {};
        //   if (files.length && files[0].path) {
        //     buffer = fs.readFileSync(files[0].path);
        //     try {
        //       forceConfig = JSON.parse(buffer.toString());
        //     } catch (error) {
        //       vscode.window.forceCode.outputChannel.appendLine('================================================================');
        //       vscode.window.forceCode.outputChannel.appendLine(error);
        //     }
        //     return Promise.resolve(forceConfig);
        //   }
        try {
            forceConfig = fs.readJsonSync(vscode.workspace.rootPath + '/force.json');
        } catch (err) {
            // forceConfig = {};
        }
        return Promise.resolve(forceConfig);
        // });
    }

    function getUsername() {
        return new Promise(function (resolve, reject) {
            getYoForceConfig().then(config => {
                let options: vscode.InputBoxOptions = {
                    placeHolder: 'mark@salesforce.com',
                    value: config.username || '',
                    prompt: 'Please enter your SFDC username',
                };
                vscode.window.showInputBox(options).then(result => {
                    config.username = result || config.username || '';
                    if (!config.username) { reject('No Username'); };
                    resolve(config);
                });
            });
        });

    }

    function getPassword(config) {
        let options: vscode.InputBoxOptions = {
            password: true,
            value: config.password || '',
            placeHolder: 'enter your password and token',
            prompt: 'Please enter your SFDC username',
        };
        return vscode.window.showInputBox(options).then(function (result: string) {
            config.password = result || config.password || '';
            if (!config.password) { throw 'No Password'; };
            return config;
        });
    }
    function getUrl(config) {
        let opts: any = [
            {
                icon: 'code',
                title: 'Production / Developer',
                url: 'https://login.salesforce.com',
            }, {
                icon: 'beaker',
                title: 'Sandbox / Test',
                url: 'https://test.salesforce.com',
            },
        ];
        let options: vscode.QuickPickItem[] = opts.map(res => {
            let icon: string = getIcon(res.icon);
            return {
                description: `${res.url}`,
                // detail: `${'Detail'}`,
                label: `$(${icon}) ${res.title}`,
            };
        });
        return vscode.window.showQuickPick(options).then((res: vscode.QuickPickItem) => {
            config.url = res.description || 'https://login.salesforce.com';
            return config;
        });
    }
    function getAutoCompile(config) {
        let options: vscode.QuickPickItem[] = [{
            description: 'Automatically deploy/compile files on save',
            label: 'Yes',
        }, {
                description: 'Deploy/compile code through the ForceCode menu',
                label: 'No',
            },
        ];
        return vscode.window.showQuickPick(options).then((res: vscode.QuickPickItem) => {
            config.autoCompile = res.label === 'Yes';
            return config;
        });
    }

    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function finished(config) {
        // console.log(config);
        fs.outputFile(vscode.workspace.rootPath + '/force.json', JSON.stringify(config, undefined, 4));
        return config;
    }
}
