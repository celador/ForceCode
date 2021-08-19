import * as vscode from 'vscode';
import { Config, IForceService } from '../forceCode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { fcConnection, ForceService, notifications } from '.';
import * as deepmerge from 'deepmerge';
import { MAX_SFDX_COPY_RETRIES, SFDX_RETRY_DELAY } from './constants';

interface SFDXConfig {
  defaultusername?: string;
}

export enum VSCODE_SETTINGS {
  allowAnonymousUsageTracking = 'allowAnonymousUsageTracking',
  autoRefresh = 'autoRefresh',
  browser = 'browser',
  bulkLoaderPollInterval = 'bulkLoaderPollInterval',
  bulkLoaderPollTimeout = 'bulkLoaderPollTimeout',
  checkForFileChanges = 'checkForFileChanges',
  retrieveCodeCoverageOnStart = 'retrieveCodeCoverageOnStart',
  retrieveCoverageOnFileRetrieval = 'retrieveCoverageOnFileRetrieval',
  defaultApiVersion = 'defaultApiVersion',
  debugFilter = 'debugFilter',
  debugOnly = 'debugOnly',
  filesExclude = 'filesExclude',
  maxFileChangeNotifications = 'maxFileChangeNotifications',
  maxQueryHistory = 'maxQueryHistory',
  maxQueryResultsPerPage = 'maxQueryResultsPerPage',
  maxSaveHistory = 'maxSaveHistory',
  onlyShowProjectUsernames = 'onlyShowProjectUsernames',
  outputQueriesAsCSV = 'outputQueriesAsCSV',
  revealTestedClass = 'revealTestedClass',
  setDefaultUsernameOnLogin = 'setDefaultUsernameOnLogin',
  showFilesOnOpen = 'showFilesOnOpen',
  showFilesOnOpenMax = 'showFilesOnOpenMax',
  showTestLog = 'showTestLog',
}

export const defaultOptions: Config = {
  alias: '',
  apiVersion: getVSCodeSetting(VSCODE_SETTINGS.defaultApiVersion),
  deployOptions: {
    allowMissingFiles: true,
    checkOnly: false,
    ignoreWarnings: true,
    purgeOnDelete: false,
    rollbackOnError: true,
    runTests: [],
    singlePackage: true,
    testLevel: 'Default',
  },
  isDeveloperEdition: false,
  overwritePackageXML: false,
  poll: 2000,
  pollTimeout: 1200,
  prefix: '',
  showTestCoverage: true,
  spaDist: '',
  src: '',
  staticResourceCacheControl: 'Private',
};

export async function getSetConfig(service?: ForceService): Promise<Config> {
  let self: IForceService = service || vscode.window.forceCode;
  const projPath = self.workspaceRoot;
  let lastUsername: string | undefined = readForceJson();
  self.config = readConfigFile(lastUsername, service);
  getSrcDir(self); // TODO this is a workaround for not populating the package dir in sfdx-project.json

  if (self.config.username) {
    await copySFDXData(self, projPath);
  }

  await fcConnection.refreshConnections();
  return Promise.resolve(self.config);
}

async function copySFDXData(
  self: IForceService,
  projPath: string,
  retryCount: number = 0
): Promise<boolean> {
  const forceConfigPath = path.join(projPath, '.forceCode', self.config.username!);
  const forceSfdxPath = path.join(forceConfigPath, '.sfdx');
  const sfdxPath = path.join(projPath, '.sfdx');
  const sfdxProjectJson = path.join(projPath, 'sfdx-project.json');
  const forceSFDXProjJson = path.join(forceConfigPath, 'sfdx-project.json');
  let sfdxStat;
  let requiresRestart = false;

  try {
    sfdxStat = fs.lstatSync(sfdxPath);
  } catch (e) {}

  if (sfdxStat) {
    if (sfdxStat.isSymbolicLink()) {
      // if it exists and is a symbolic link, remove it so we can relink with the new login
      fs.unlinkSync(sfdxPath);
    } else {
      // not a symbolic link, so move it because it's an SFDX proj folder
      try {
        fs.copySync(sfdxPath, forceSfdxPath, { overwrite: true });
        fs.removeSync(sfdxPath);
      } catch (e) {
        notifications.writeLog(e);
        retryCount++;
        if (retryCount > MAX_SFDX_COPY_RETRIES) {
          requiresRestart = true;
        } else {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(copySFDXData(self, projPath, retryCount));
            }, SFDX_RETRY_DELAY);
          });
        }
      }

      // if the sfdx-project.json file exists, move it into the .forceCode folder
      if (fs.existsSync(sfdxProjectJson)) {
        fs.moveSync(sfdxProjectJson, forceSFDXProjJson, {
          overwrite: true,
        });
      }
    }
  }

  if (!fs.existsSync(forceSfdxPath)) {
    fs.mkdirpSync(forceSfdxPath);
  }

  // link to the newly logged in org's sfdx folder in .forceCode/USERNAME/.sfdx
  try {
    fs.symlinkSync(forceSfdxPath, sfdxPath, 'junction');
  } catch (e) {
    notifications.writeLog(e);
    requiresRestart = true;
  }

  if (!fs.existsSync(forceSFDXProjJson)) {
    // add in a bare sfdx-project.json file for language support from official salesforce extensions
    const sfdxProj: {} = {
      namespace: self.config.prefix,
      packageDirectories: [
        {
          path: self.config.src,
          default: true,
        },
      ],
      sfdcLoginUrl: self.config.url,
      sourceApiVersion: self.config.apiVersion,
    };

    fs.outputFileSync(forceSFDXProjJson, JSON.stringify(sfdxProj, undefined, 4));
  }

  // copy the sfdx-project.json for the logged in org into the project folder
  fs.copyFileSync(forceSFDXProjJson, sfdxProjectJson);

  // update the defaultusername in the sfdx config file...
  if (getVSCodeSetting(VSCODE_SETTINGS.setDefaultUsernameOnLogin)) {
    const sfdxConfigPath = path.join(sfdxPath, 'sfdx-config.json');
    let sfdxConfig: SFDXConfig = {};
    if (fs.existsSync(sfdxConfigPath)) {
      sfdxConfig = fs.readJsonSync(sfdxConfigPath);
    }
    sfdxConfig.defaultusername = self.config.username;
    fs.outputFileSync(sfdxConfigPath, JSON.stringify(sfdxConfig, undefined, 4));
  }

  if (requiresRestart) {
    notifications.showWarning(
      'Existing SFDX project found. Please close VSCode and open the project folder in a file explorer. Delete the .sfdx folder, then re-open VSCode'
    );
  }

  return Promise.resolve(!requiresRestart);
}

export function readForceJson(): string | undefined {
  const projPath = vscode.window.forceCode.workspaceRoot;
  let lastUsername: string | undefined;
  if (fs.existsSync(path.join(projPath, 'force.json'))) {
    let forceFile = fs.readJsonSync(path.join(projPath, 'force.json'));
    lastUsername = forceFile.lastUsername;
  }
  return lastUsername;
}

export function saveConfigFile(userName: string | undefined, config: Config) {
  if (userName) {
    fs.outputFileSync(
      path.join(vscode.window.forceCode.workspaceRoot, '.forceCode', userName, 'settings.json'),
      JSON.stringify(config, undefined, 4)
    );
  }
}

export function readConfigFile(userName: string | undefined, service?: ForceService): Config {
  let self: IForceService = service || vscode.window.forceCode;
  let config: Config = defaultOptions;
  if (userName) {
    const configPath: string = path.join(
      self.workspaceRoot,
      '.forceCode',
      userName,
      'settings.json'
    );
    if (fs.existsSync(configPath)) {
      config = fs.readJsonSync(configPath);
    } else {
      config.username = userName;
    }
  }
  return deepmerge(defaultOptions, config);
}

export function removeConfigFolder(userName: string): boolean {
  if (userName) {
    const configDir: string = path.join(
      vscode.window.forceCode.workspaceRoot,
      '.forceCode',
      userName
    );
    if (fs.existsSync(configDir)) {
      fs.removeSync(configDir);
      return true;
    }
  }
  return false;
}

export function getVSCodeSetting(name: VSCODE_SETTINGS) {
  return vscode.workspace.getConfiguration('force')[name];
}

/**
 *
 * @returns The directory which the source code is stored. If we're using the "source" format, then it will be a little different
 */
export function getSrcDir(service?: IForceService): string {
  let self: IForceService = service || vscode.window.forceCode;
  let src = self.config.src;
  const useSrc = self.config.useSourceFormat;
  src = src && src.trim() !== '' ? src : undefined;
  if (!src) {
    src = useSrc ? 'force-app' : 'src';
    if (src != self.config.src) {
      self.config.src = src;
      saveConfigFile(self.config.username, self.config);
    }
  }
  let srcPath =
    self.workspaceRoot + path.sep + src + (useSrc ? path.sep + 'main' + path.sep + 'default' : '');
  if (!fs.existsSync(srcPath)) {
    fs.mkdirpSync(srcPath);
  }
  return srcPath;
}
