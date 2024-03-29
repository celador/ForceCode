import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as deepmerge from 'deepmerge';
import {
  getSetConfig,
  fcConnection,
  notifications,
  saveConfigFile,
  readConfigFile,
} from '../services';
import { ForcecodeCommand } from '.';

interface PDir {
  default: boolean;
  path: string;
}

interface SFDXProjectJson {
  packageDirectories: PDir[];
}

export class Settings extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.settings';
    this.name = 'Opening settings';
    this.hidden = false;
    this.description = 'Settings';
    this.detail = 'Change project settings specific to each org.';
    this.icon = 'gear';
    this.label = 'Org Settings';
  }

  public command(): any {
    const myExt = vscode.extensions.getExtension('JohnAaronNelson.forcecode');
    if (!myExt) {
      return Promise.reject();
    }
    const SETTINGS_FILE: string = path.join(myExt.extensionPath, 'pages', 'settings.html');
    const panel = vscode.window.createWebviewPanel(
      'fcSettings',
      'ForceCode Settings',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    let tempSettings: any;
    let currentSettings = vscode.window.forceCode.config;
    let userNames: string[];

    const overwriteMerge = (_destinationArray: any, sourceArray: any, _options: any) => sourceArray;

    panel.webview.html = getSettingsPage();

    panel.webview.onDidReceiveMessage(handleMessage, undefined);

    return refreshUsernames();

    function handleMessage(message: Partial<any>) {
      if (message.save) {
        handleSaveMessage();
      } else if (message.switchUsername && message.username !== currentSettings.username) {
        handleSwitchUsernameMessage(message.username);
      } else if (message.removeConfig) {
        handleRemoveConfigMessage(message.username);
      } else {
        tempSettings = deepmerge(tempSettings, message, {
          arrayMerge: overwriteMerge,
        });
      }
    }

    function handleSaveMessage() {
      if (!currentSettings.username) {
        return;
      }
      updateSfdxProjectJson();
      currentSettings = deepmerge(currentSettings, tempSettings, {
        arrayMerge: overwriteMerge,
      });
      saveConfigFile(currentSettings.username, currentSettings);
      if (currentSettings.username === vscode.window.forceCode.config.username) {
        vscode.window.forceCode.config = currentSettings;
      }
      getSetConfig();
      notifications.showInfo('ForceCode settings saved successfully!', 'OK');
    }

    function handleSwitchUsernameMessage(username: string | undefined) {
      tempSettings = {};
      currentSettings = readConfigFile(username);
      sendSettings();
    }

    function handleRemoveConfigMessage(username: any) {
      vscode.commands.executeCommand('ForceCode.removeConfig', username).then(() => {
        currentSettings = vscode.window.forceCode.config;
        refreshUsernames();
      });
    }

    function refreshUsernames() {
      return fcConnection.getSavedUsernames().then((uNames) => {
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

    function updateSfdxProjectJson() {
      if (!currentSettings.username) {
        return;
      }
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
        let sfdxProjJson: SFDXProjectJson = fs.readJsonSync(sfdxProjJsonPath);
        if (sfdxProjJson.packageDirectories?.length > 0) {
          const forceProjIndex: number = sfdxProjJson.packageDirectories.findIndex(
            (dir) => dir.path === currentSettings.src
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
    }

    function getSettingsPage(): string {
      return fs.readFileSync(SETTINGS_FILE).toString();
    }
  }
}
