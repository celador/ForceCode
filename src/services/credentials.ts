import * as vscode from 'vscode';
import {
  fcConnection,
  dxService,
  readConfigFile,
  saveConfigFile,
  defaultOptions,
  FCOauth,
  notifications,
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
  const opts = buildOptions(uNames, orgs);

  // ask if the user wants to log into a different account
  const theseOptions: vscode.QuickPickOptions = {
    ignoreFocusOut: true,
    placeHolder: 'Select a saved org or login to a new one...',
  };
  const choice = await vscode.window.showQuickPick(opts, theseOptions);
  if (!choice || choice.label === undefined) {
    return Promise.reject(undefined);
  } else if (choice.label === 'New Org') {
    return Promise.resolve(setupNewUser(defaultOptions));
  } else {
    const cfg = readConfigFile(choice.label);
    let orgInfo;
    try {
      orgInfo = await dxService.getOrgInfo(cfg.username);
    } catch (error) {
      notifications.writeLog(error);
    } finally {
      if (orgInfo) {
        return Promise.resolve(orgInfo);
      } else {
        return Promise.resolve(setupNewUser(cfg));
      }
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

function buildOptions(uNames: string[], orgs: any[]): vscode.QuickPickItem[] {
  const newOrgOption = {
    title: 'New Org',
    desc: 'You will be asked for your login information for the new org',
  };

  const savedOrgOptions = uNames.map((uName) => ({ title: uName, desc: '' }));

  const unsavedOrgOptions = orgs
    .filter((currentOrg) => !uNames.includes(currentOrg.username || ''))
    .map((filteredOrg) => ({ title: filteredOrg.username, desc: '' }));

  return [newOrgOption, ...savedOrgOptions, ...unsavedOrgOptions].map((res) => ({
    description: res.desc,
    label: res.title,
  }));
}

export function checkConfig(cfg: Config): Promise<Config> {
  return getUrl(cfg).then(getAutoCompileAndFormat);
}

async function getUrl(config: Config): Promise<Config> {
  if (Object.keys(config).indexOf('url') === -1) {
    const options = buildUrlOptions();
    const choice = await vscode.window.showQuickPick(options, quickPickOptions);

    if (choice?.description === 'https://example.my.salesforce.com') {
      const cDomain = await vscode.window.showInputBox({
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

function buildUrlOptions(): vscode.QuickPickItem[] {
  const opts = [
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

  return opts.map((res) => ({
    description: res.url,
    label: `$(${res.icon}) ${res.title}`,
  }));
}

async function getAutoCompileAndFormat(config: Config): Promise<Config> {
  if (Object.keys(config).indexOf('autoCompile') === -1) {
    const options = [
      {
        description: 'Automatically deploy/compile files on save',
        label: 'Yes',
      },
      {
        description: 'Deploy/compile code through the ForceCode menu',
        label: 'No',
      },
    ];

    const choice = await vscode.window.showQuickPick(options, {
      ignoreFocusOut: true,
    });

    config.autoCompile = choice?.label === 'Yes';

    // only ask for new projects since there's issues switching between formats currently
    if (Object.keys(config).indexOf('useSourceFormat') === -1) {
      const sourceOptions = [
        {
          description: 'This is the "classic" format/project folder setup.',
          label: 'Metadata',
        },
        {
          description: 'This is the SFDX Source format/project folder setup.',
          label: 'Source',
        },
      ];

      const sourceChoice = await vscode.window.showQuickPick(sourceOptions, {
        ignoreFocusOut: true,
      });

      config.useSourceFormat = sourceChoice?.label === 'Source';
    }
  }

  return Promise.resolve(config);
}
