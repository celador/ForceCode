import * as vscode from 'vscode';
import { fcConnection, dxService } from '.';
import { FCOauth } from './fcConnection';
import { Config } from '../forceCode';
import { readConfigFile, saveConfigFile } from './configuration';
import * as deepmerge from 'deepmerge';

const quickPickOptions: vscode.QuickPickOptions = {
  ignoreFocusOut: true,
};
export function enterCredentials(): Promise<FCOauth> {
  return fcConnection.getSavedUsernames().then(uNames => {
    return dxService.orgList().then(orgs => {
      return new Promise(resolve => {
        // ask if the user wants to log into a different account
        let opts: any[] = [
          {
            title: 'New Org',
            desc: 'You will be asked for your login information for the new org',
          },
        ];

        uNames.forEach(uName => {
          opts.push({
            title: uName,
            desc: '',
          });
        });

        // add orgs that are authenticated, but not saved in the project
        if (orgs) {
          orgs
            .filter(currentOrg => !uNames.includes(currentOrg.username))
            .forEach(filteredOrg => {
              opts.push({
                title: filteredOrg.username,
                desc: '',
              });
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
          placeHolder: 'Select a saved org or login to a new one...',
        };
        return vscode.window
          .showQuickPick(options, theseOptions)
          .then((res: vscode.QuickPickItem) => {
            if (!res || res.label === undefined) {
              return undefined;
            } else if (res.label === 'New Org') {
              return resolve(setupNewUser({}));
            } else {
              const cfg = readConfigFile(res.label); //res.label.split(' ')[1]);
              return dxService
                .getOrgInfo(cfg.username)
                .then(orgInfo => {
                  return resolve(orgInfo);
                })
                .catch(() => {
                  return resolve(setupNewUser(cfg));
                });
            }
          });
      });
    });
  });

  function setupNewUser(cfg): Promise<FCOauth> {
    return checkConfig(cfg)
      .then(login)
      .then(orgInfo => {
        saveConfigFile(orgInfo.username, deepmerge(readConfigFile(orgInfo.username), cfg));
        return orgInfo;
      });
  }

  function login(config): Promise<FCOauth> {
    return dxService.login(config.url);
  }
}

export function checkConfig(cfg: Config): Promise<Config> {
  return getUrl(cfg).then(getAutoCompile);
}

function getUrl(config): Promise<Config> {
  return new Promise(function(resolve, reject) {
    if (Object.keys(config).indexOf('url') === -1) {
      let opts: any = [
        {
          icon: 'code',
          title: 'Production / Developer',
          url: 'https://login.salesforce.com',
        },
        {
          icon: 'beaker',
          title: 'Sandbox / Test',
          url: 'https://test.salesforce.com',
        },
        {
          icon: 'tools',
          title: 'Custom domain',
          url: 'https://example.my.salesforce.com',
        },
      ];
      let options: vscode.QuickPickItem[] = opts.map(res => {
        return {
          description: `${res.url}`,
          // detail: `${'Detail'}`,
          label: `$(${res.icon}) ${res.title}`,
        };
      });
      vscode.window.showQuickPick(options, quickPickOptions).then((res: vscode.QuickPickItem) => {
        if (res && res.description === 'https://example.my.salesforce.com') {
          vscode.window
            .showInputBox({
              ignoreFocusOut: true,
              placeHolder: 'Enter your custom domain then press Enter...',
            })
            .then(cDomain => {
              config.url = cDomain || 'https://login.salesforce.com';
              resolve(config);
            });
        } else {
          config.url = res.description || 'https://login.salesforce.com';
          resolve(config);
        }
      });
    } else {
      resolve(config);
    }
  });
}

function getAutoCompile(config): Promise<Config> {
  return new Promise(function(resolve, reject) {
    if (Object.keys(config).indexOf('autoCompile') === -1) {
      let options: vscode.QuickPickItem[] = [
        {
          description: 'Automatically deploy/compile files on save',
          label: 'Yes',
        },
        {
          description: 'Deploy/compile code through the ForceCode menu',
          label: 'No',
        },
      ];
      vscode.window
        .showQuickPick(options, { ignoreFocusOut: true })
        .then((res: vscode.QuickPickItem) => {
          config.autoCompile = res.label === 'Yes';
          resolve(config);
        });
    } else {
      resolve(config);
    }
  });
}
