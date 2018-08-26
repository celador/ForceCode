import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { getIcon } from './../parsers';
import { configuration, switchUserViewService, commandService } from './../services';
import constants from './../models/constants';
import { Org } from '../services/switchUserView';

const quickPickOptions: vscode.QuickPickOptions = {
    ignoreFocusOut: true
};
export default function enterCredentials(): Promise<any> {
    return configuration()
        .then(cfg => {
            // ask if the user wants to log into a different account
            let opts: any[] = [
                {
                    title: 'New Org',
                    desc: 'You will be asked for your login information for the new org'
                }
            ];

            var orgs: Org[] = switchUserViewService.getChildren();
            if(orgs) {
                orgs.forEach(curOrg => {
                    if(curOrg.orgInfo.username !== switchUserViewService.orgInfo.username) {
                        opts.push({
                            title: curOrg.orgInfo.username,
                            desc: ''
                        });
                    }
                });
            }

            let options: vscode.QuickPickItem[] = opts.map(res => {
                return {
                    description: `${res.desc}`,
                    // detail: `${'Detail'}`,
                    label: `${res.title}`,
                };
            });
            const theseOptions: vscode.QuickPickOptions = {
                ignoreFocusOut: true,
                placeHolder: 'Select a saved org or login to a new one...'
            };
            return vscode.window.showQuickPick(options, theseOptions).then((res: vscode.QuickPickItem) => {
                if(!res || res.label === undefined) {
                    return cfg;
                } else if(res.label === 'New Org') {
                    return setupNewUser(cfg);
                } else {
                    
                    switchUserViewService.orgInfo = switchUserViewService.getOrgInfoByUserName(res.label);
                    cfg.username = res.label;
                    cfg.url = switchUserViewService.orgInfo.loginUrl;
                    return commandService.runCommand('ForceCode.switchUserText', { username: res.label, loginUrl: cfg.url}).then(() => {
                        return Promise.resolve(cfg);
                    });
                    //return vscode.window.forceCode.dxCommands.login(switchUserViewService.orgInfo.loginUrl)
                    //    .then(() => {
                    //        return Promise.resolve(cfg);
                    //    });
                }
            });
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
                value: !switchUserViewService.isLoggedIn() ? config.username : '',
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
        if(!switchUserViewService.isLoggedIn()) {
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
        return config;
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
                'ignoreWarnings': true,
            },
            overwritePackageXML: false,
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
        switchUserViewService.orgInfo.username = config.username;
        return vscode.window.forceCode.dxCommands.login(config.url)
            .then(() => {
                return Promise.resolve(configuration());
            });
    }
}
