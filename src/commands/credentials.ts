import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { getIcon } from './../parsers';
import { configuration } from './../services';
import DXService from '../services/dxService';

const quickPickOptions: vscode.QuickPickOptions = {
    ignoreFocusOut: true
};
export default function enterCredentials() {
    return getUsername()
        .then(cfg => getUrl(cfg))
        .then(cfg => getAutoCompile(cfg))
        .then(cfg => writeConfigAndLogin(cfg))
        .catch(err => vscode.window.forceCode.outputError(err, vscode.window.forceCode.outputChannel));
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
    function writeConfigAndLogin(config) {
        const projPath = vscode.workspace.rootPath + path.sep;
        const defaultOptions: {} = {
            autoRefresh: false,
            showTestCoverage: true,
            showTestLog: true,
            browser: 'Google Chrome Canary',
            pollTimeout: 1200,
            debugOnly: true,
            debugFilter: 'USER_DEBUG|FATAL_ERROR',
            apiVersion: '42.0',
            deployOptions: {
                'checkOnly': false,
                'testLevel': 'runLocalTests',
                'verbose': false,
                'ignoreWarnings': true,
            },
        };
        // add in a bare sfdx-project.json file for language support from official salesforce extensions
        const sfdxProj: {} = {
            namespace: "", 
            sfdcLoginUrl: config.url, 
            sourceApiVersion: "42.0",
        };
        
        fs.outputFile(projPath + 'sfdx-project.json', JSON.stringify(sfdxProj, undefined, 4));
        fs.outputFile(projPath + 'force.json', JSON.stringify(Object.assign(defaultOptions, config), undefined, 4));
        // log in with dxLogin
        if(vscode.window.forceCode.dxCommands === undefined) {
            vscode.window.forceCode.dxCommands = new DXService();
        }
        return vscode.window.forceCode.dxCommands.login()
            .then(res => {
                vscode.window.forceCode.statusBarItem.show();
                return config;
            });
    }
}
