import * as vscode from 'vscode';
import { getIcon } from './../parsers';
import { configuration, fcConnection, dxService } from './../services';
import { FCConnection, FCOauth } from '../services/fcConnection';

const quickPickOptions: vscode.QuickPickOptions = {
    ignoreFocusOut: true
};
export default function enterCredentials(skipAndLogin?: boolean): Promise<FCOauth> {
    if(skipAndLogin) {
        return writeConfigAndLogin(vscode.window.forceCode.config);
    }
    return configuration()
        .then(cfg => {
            // ask if the user wants to log into a different account
            let opts: any[] = [
                {
                    title: 'New Org',
                    desc: 'You will be asked for your login information for the new org'
                }
            ];

            var orgs: FCConnection[] = fcConnection.getChildren();
            if(orgs) {
                orgs.forEach(curOrg => {
                    if(!fcConnection.currentConnection || curOrg.orgInfo.username !== fcConnection.currentConnection.orgInfo.username) {
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
                    return undefined;
                } else if(res.label === 'New Org') {
                    return setupNewUser(cfg);
                } else {
                    
                    const curConn: FCConnection = fcConnection.getConnByUsername(res.label);
                    cfg.username = res.label;
                    cfg.url = curConn.orgInfo.loginUrl;
                    if(curConn.isLoggedIn()) {
                        return Promise.resolve(curConn.orgInfo);
                    } else {
                        return writeConfigAndLogin(cfg)
                    }
                }
            });
        });
    
    function setupNewUser(cfg) {
        return getUrl(cfg)
            .then(cfg => getAutoCompile(cfg))
            .then(cfg => writeConfigAndLogin(cfg));
    }
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================

    function getUrl(config) {
        return new Promise(function (resolve, reject) {
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
            vscode.window.showQuickPick(options, quickPickOptions).then((res: vscode.QuickPickItem) => {
                config.url = res.description || 'https://login.salesforce.com';
                resolve(config);
            });
        });
    }
    function getAutoCompile(config) {
        if(config.autoCompile === undefined) {
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
    function writeConfigAndLogin(config): Promise<FCOauth> {
        return dxService.login(config.url);
    }
}
