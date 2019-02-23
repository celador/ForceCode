import * as vscode from 'vscode';
import { Config } from './../forceCode';
import * as forceCode from './../forceCode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { fcConnection, ForceService } from '.';
import * as deepmerge from 'deepmerge';

export const defaultOptions: Config = {
  alias: '',
  apiVersion: vscode.workspace.getConfiguration('force')['defaultApiVersion'],
  deployOptions: {
    allowMissingFiles: true,
    checkOnly: false,
    ignoreWarnings: true,
    purgeOnDelete: false,
    rollbackOnError: true,
    runTests: [],
    singlePackage: true,
    testLevel: 'NoTestRun',
  },
  overwritePackageXML: false,
  poll: 1500,
  pollTimeout: 1200,
  prefix: '',
  showTestCoverage: true,
  spaDist: '',
  src: 'src',
  staticResourceCacheControl: 'Private',
};

export default function getSetConfig(service?: ForceService): Promise<Config> {
  var self: forceCode.IForceService = service || vscode.window.forceCode;
  const projPath = self.workspaceRoot;
  var lastUsername: string;
  if (fs.existsSync(path.join(projPath, 'force.json'))) {
    var forceFile = fs.readJsonSync(path.join(projPath, 'force.json'));
    lastUsername = forceFile.lastUsername;
  }
  self.config = readConfigFile(lastUsername, service);

  self.projectRoot = path.join(projPath, self.config.src);
  if (!fs.existsSync(self.projectRoot)) {
    fs.mkdirpSync(self.projectRoot);
  }
  if (!fs.existsSync(path.join(projPath, 'sfdx-project.json'))) {
    // add in a bare sfdx-project.json file for language support from official salesforce extensions
    const sfdxProj: {} = {
      namespace: '',
      packageDirectories: [
        {
          path: 'src',
          default: true,
        },
      ],
      sfdcLoginUrl: 'https://login.salesforce.com/',
      sourceApiVersion: vscode.workspace.getConfiguration('force')['defaultApiVersion'],
    };

    fs.outputFileSync(
      path.join(projPath, 'sfdx-project.json'),
      JSON.stringify(sfdxProj, undefined, 4)
    );
  }
  return fcConnection.refreshConnections().then(() => {
    return Promise.resolve(self.config);
  });
}

export function saveConfigFile(userName: string, config: Config) {
  fs.outputFileSync(
    path.join(vscode.window.forceCode.workspaceRoot, '.forceCode', userName, 'settings.json'),
    JSON.stringify(config, undefined, 4)
  );
}

export function readConfigFile(userName: string, service?: ForceService): Config {
  var self: forceCode.IForceService = service || vscode.window.forceCode;
  var config: Config = {};
  if (userName) {
    const configPath: string = path.join(
      self.workspaceRoot,
      '.forceCode',
      userName,
      'settings.json'
    );
    if (fs.existsSync(configPath)) {
      config = fs.readJsonSync(configPath);
      // these are temporary, just to purge old settings. Will remove in a future release ===
      delete config['autoRefresh'];
      delete config['browser'];
      delete config['checkForFileChanges'];
      delete config['debugFilter'];
      delete config['debugOnly'];
      delete config['maxFileChangeNotifications'];
      delete config['maxQueryHistory'];
      delete config['maxQueryResultsPerPage'];
      delete config['outputQueriesAsCSV'];
      delete config['revealTestedClass'];
      delete config['showFilesOnOpen'];
      delete config['showFilesOnOpenMax'];
      delete config['showTestLog'];
      // ====================================================================================
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
