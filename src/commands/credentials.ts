import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { getIcon } from './../parsers';
import { configuration } from './../services';
import constants from './../models/constants';

const quickPickOptions: vscode.QuickPickOptions = {
    ignoreFocusOut: true
};
export default function enterCredentials(): Promise<any> {
    return configuration()
        .then(cfg => {
            if(cfg.username !== undefined && cfg.username !== '') {
                // ask if the user wants to log into a different account
                let opts: any = [
                    {
                        title: 'Yes',
                        desc: 'You will be asked for your login information for the other org'
                    }, {
                        title: 'No',
                        desc: 'Log into the org saved whose login data is currently in force.json'
                    },
                ];
                let options: vscode.QuickPickItem[] = opts.map(res => {
                    return {
                        description: `${res.desc}`,
                        // detail: `${'Detail'}`,
                        label: `${res.title}`,
                    };
                });
                const theseOptions: vscode.QuickPickOptions = {
                    ignoreFocusOut: true,
                    placeHolder: 'Log into a different org?'
                };
                return vscode.window.showQuickPick(options, theseOptions).then((res: vscode.QuickPickItem) => {
                    if(res.label === undefined) {
                        return cfg;
                    } else if(res.label === 'Yes') {
                        return vscode.window.forceCode.dxCommands.logout()
                            .then(() => {
                                return setupNewUser(cfg);
                            });
                    } else {
                        return vscode.window.forceCode.dxCommands.login()
                            .then(() => {
                                return Promise.resolve(cfg);
                            });
                    }
                });
            } else {
                return setupNewUser(cfg);     
            }
        });
    
    function setupNewUser(cfg) {
        return getUsername(cfg)
            .then(cfg => getUrl(cfg))
            .then(cfg => getAutoCompile(cfg))
            .then(cfg => writeConfigAndLogin(cfg))
            .catch(err => vscode.window.showErrorMessage(err.message));
    }
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================

    function getUsername(config) {
        return new Promise(function (resolve, reject) {
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
    function writeConfigAndLogin(config): Promise<any> {
        const projPath = vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep;
        const defaultOptions: {} = {
            checkForFileChanges: true,
            autoRefresh: false,
            showTestCoverage: true,
            showTestLog: true,
            showFilesOnOpen: true,
            showFilesOnOpenMax: 3,
            browser: 'Google Chrome Canary',
            pollTimeout: 1200,
            debugOnly: true,
            debugFilter: 'USER_DEBUG|FATAL_ERROR',
            apiVersion: constants.API_VERSION,
            deployOptions: {
                'checkOnly': false,
                'runAllTests': false,
                'verbose': false,
                'ignoreWarnings': true,
            },
        };
        // add in a bare sfdx-project.json file for language support from official salesforce extensions
        const sfdxProj: {} = {
            namespace: "", 
            sfdcLoginUrl: config.url, 
            sourceApiVersion: constants.API_VERSION,
        };
        
        fs.outputFile(projPath + 'sfdx-project.json', JSON.stringify(sfdxProj, undefined, 4));
        fs.outputFile(projPath + 'force.json', JSON.stringify(Object.assign(defaultOptions, config), undefined, 4));
        // log in with dxLogin
        return vscode.window.forceCode.dxCommands.login()
            .then(() => {
                return Promise.resolve(configuration());
            });
    }
}
