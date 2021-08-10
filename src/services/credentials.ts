import * as vscode from 'vscode';
import {
  fcConnection,
  dxService,
  readConfigFile,
  saveConfigFile,
  defaultOptions,
  FCOauth,
} from '.';
import { Config } from '../forceCode';
import * as deepmerge from 'deepmerge';
import { FCCancellationToken } from '../commands';

const quickPickOptions: vscode.QuickPickOptions = {
  ignoreFocusOut: true,
};
export async function enterCredentials(cancellationToken: FCCancellationToken): Promise<FCOauth> {
  const uNames = await fcConnection.getSavedUsernames();
  const orgs = await dxService.orgList();
  // ask if the user wants to log into a different account
  let opts: any[] = [
    {
      title: 'New Org',
      desc: 'You will be asked for your login information for the new org',
    },
  ];

  uNames.forEach((uName) => {
    opts.push({
      title: uName,
      desc: '',
    });
  });

  // add orgs that are authenticated, but not saved in the project
  if (orgs) {
    orgs
      .filter((currentOrg) => !uNames.includes(currentOrg.username || ''))
      .forEach((filteredOrg) => {
        opts.push({
          title: filteredOrg.username,
          desc: '',
        });
      });
  }

  let options: vscode.QuickPickItem[] = opts.map((res) => {
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
  const choice = await vscode.window.showQuickPick(options, theseOptions);
  if (!choice || choice.label === undefined) {
    return Promise.reject(undefined);
  } else if (choice.label === 'New Org') {
    return Promise.resolve(setupNewUser(defaultOptions));
  } else {
    const cfg = readConfigFile(choice.label);
    try {
      const orgInfo = await dxService.getOrgInfo(cfg.username);
      return Promise.resolve(orgInfo);
    } catch (_error) {
      return Promise.resolve(setupNewUser(cfg));
    }
  }

  async function setupNewUser(cfg: Config): Promise<FCOauth> {
    const config = await checkConfig(cfg);
    const orgInfo = await login(config);
    saveConfigFile(orgInfo.username, deepmerge(readConfigFile(orgInfo.username), cfg));
    return Promise.resolve(orgInfo);
  }

  function login(config: Config): Promise<FCOauth> {
    return dxService.login(config.url, cancellationToken);
  }
}

export function checkConfig(cfg: Config): Promise<Config> {
  return getUrl(cfg).then(getAutoCompileAndFormat);
}

async function getUrl(config: Config): Promise<Config> {
  if (Object.keys(config).indexOf('url') === -1) {
    let opts: any = [
      {
        icon: 'file',
        title: 'Production',
        url: 'https://login.salesforce.com',
      },
      {
        icon: 'code',
        title: 'Developer',
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
    let options: vscode.QuickPickItem[] = opts.map((res: any) => {
      return {
        description: `${res.url}`,
        // detail: `${'Detail'}`,
        label: `$(${res.icon}) ${res.title}`,
      };
    });
    const choice: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(
      options,
      quickPickOptions
    );
    if (choice?.description === 'https://example.my.salesforce.com') {
      const cDomain: string | undefined = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        placeHolder: 'Enter your custom domain then press Enter...',
      });
      config.url = cDomain || 'https://login.salesforce.com';
    } else {
      config.url = choice?.description || 'https://login.salesforce.com';
      config.isDeveloperEdition = choice?.label?.endsWith('Developer') || false;
    }
  }
  return Promise.resolve(config);
}

async function getAutoCompileAndFormat(config: Config): Promise<Config> {
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
    const choice: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(options, {
      ignoreFocusOut: true,
    });
    config.autoCompile = choice?.label === 'Yes';

    // only ask for new projects since there's issues switching between formats currently
    if (Object.keys(config).indexOf('useSourceFormat') === -1) {
      let sourceOptions: vscode.QuickPickItem[] = [
        {
          description: 'This is the "classic" format/project folder setup.',
          label: 'Metadata',
        },
        {
          description: 'This is the SFDX Source format/project folder setup.',
          label: 'Source',
        },
      ];
      const sourceChoice: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(
        sourceOptions,
        {
          ignoreFocusOut: true,
        }
      );
      config.useSourceFormat = sourceChoice?.label === 'Source';
    }
  }
  return Promise.resolve(config);
}
