import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as deepmerge from 'deepmerge';
import { saveConfigFile, readConfigFile } from '../services/configuration';
import { configuration, fcConnection, commandService } from '../services';

interface PDir {
  default: boolean;
  path: string;
}

interface SFDXProjectJson {
  packageDirectories: PDir[];
}

export default function settings(): Promise<any> {
  const myExtDir = vscode.extensions.getExtension('JohnAaronNelson.forcecode').extensionPath;
  const SETTINGS_FILE: string = path.join(myExtDir, 'pages', 'settings.html');
  const panel = vscode.window.createWebviewPanel(
    'fcSettings',
    'ForceCode Settings',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  var tempSettings = {};
  var currentSettings = vscode.window.forceCode.config;
  var userNames: string[];

  // And set its HTML content
  panel.webview.html = getSettingsPage();

  const overwriteMerge = (destinationArray, sourceArray, options) => sourceArray;

  // handle settings changes
  panel.webview.onDidReceiveMessage(message => {
    if (message.save) {
      // if the src folder is changed, then update in packageDirectories in sfdx-config.json as well
      const sfdxProjJsonPath = path.join(
        vscode.window.forceCode.workspaceRoot,
        '.forceCode',
        currentSettings.username,
        'sfdx-project.json'
      );
      if (
        tempSettings['src'] &&
        tempSettings['src'] !== currentSettings.src &&
        fs.existsSync(sfdxProjJsonPath)
      ) {
        var sfdxProjJson: SFDXProjectJson = fs.readJsonSync(sfdxProjJsonPath);
        if (sfdxProjJson.packageDirectories && sfdxProjJson.packageDirectories.length > 0) {
          const forceProjIndex: number = sfdxProjJson.packageDirectories.findIndex(
            dir => dir.path === currentSettings.src
          );
          if (forceProjIndex > -1) {
            const currentDirInfo: PDir = sfdxProjJson.packageDirectories[forceProjIndex];
            sfdxProjJson.packageDirectories.splice(forceProjIndex, 1, {
              path: tempSettings['src'],
              default: currentDirInfo.default,
            });
            fs.outputFileSync(sfdxProjJsonPath, JSON.stringify(sfdxProjJson, undefined, 4));
          }
        }
      }
      currentSettings = deepmerge(currentSettings, tempSettings, {
        arrayMerge: overwriteMerge,
      });
      saveConfigFile(currentSettings.username, currentSettings);
      if (currentSettings.username === vscode.window.forceCode.config.username) {
        vscode.window.forceCode.config = currentSettings;
      }
      configuration();
      vscode.window.showInformationMessage('ForceCode settings saved successfully!', 'OK');
    } else if (message.switchUsername && message.username !== currentSettings.username) {
      // the user wants to change settings for another username
      tempSettings = {};
      currentSettings = readConfigFile(message.username);
      sendSettings();
    } else if (message.removeConfig) {
      commandService.runCommand('ForceCode.removeConfig', message.username).then(() => {
        currentSettings = vscode.window.forceCode.config;
        refreshUsernames();
      });
    } else {
      tempSettings = deepmerge(tempSettings, message, {
        arrayMerge: overwriteMerge,
      });
    }
  }, undefined);

  return refreshUsernames();

  function refreshUsernames() {
    return fcConnection.getSavedUsernames().then(uNames => {
      userNames = uNames;
      sendSettings();
    });
  }

  function sendSettings() {
    panel.webview.postMessage({
      currentSettings: currentSettings,
      currentUserName: vscode.window.forceCode.config.username,
      userNames: userNames,
    });
  }

  function getSettingsPage(): string {
    return fs.readFileSync(SETTINGS_FILE).toString();
  }
}
