import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { getIcon } from './../parsers';
import * as error from './../util/error';
import { configuration } from './../services';

const quickPickOptions: vscode.QuickPickOptions = {
    ignoreFocusOut: true
};
export default function enterCredentials() {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Show Menu';
    return getUsername()
        .then(cfg => getPassword(cfg))
        .then(cfg => getUrl(cfg))
        .then(cfg => getAutoCompile(cfg))
        .then(cfg => finished(cfg))
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================

    function getUsername() {
        return new Promise(function (resolve, reject) {
            configuration().then(config => {
                let options: vscode.InputBoxOptions = {
                    ignoreFocusOut: true,
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
            ignoreFocusOut: true,
            password: true,
            value: config.password || '',
            placeHolder: 'enter your password and token',
            prompt: 'Please enter your SFDC password and token',
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
        return vscode.window.showQuickPick(options, quickPickOptions).then((res: vscode.QuickPickItem) => {
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
        return vscode.window.showQuickPick(options, quickPickOptions).then((res: vscode.QuickPickItem) => {
            config.autoCompile = res.label === 'Yes';
            return config;
        });
    }

    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function finished(config) {
        const defaultOptions: {} = {
            autoRefresh: false,
            browser: 'Google Chrome Canary',
            pollTimeout: 1200,
            debugOnly: true,
            debugFilter: 'USER_DEBUG|FATAL_ERROR',
            apiVersion: '38.0',
            deployOptions: {
                'checkOnly': false,
                'testLevel': 'runLocalTests',
                'verbose': false,
                'ignoreWarnings': true,
            },
        };
        fs.outputFile(vscode.workspace.rootPath + path.sep + 'force.json', JSON.stringify(Object.assign(defaultOptions, config), undefined, 4));
        return config;
    }
}
