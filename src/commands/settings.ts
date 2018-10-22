import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as deepmerge from 'deepmerge'
import { saveConfigFile, readConfigFile } from '../services/configuration';
import { configuration, fcConnection } from '../services';

export default function settings(): Promise<any> {
    const myExtDir = vscode.extensions.getExtension("JohnAaronNelson.forcecode").extensionPath;
    const SETTINGS_FILE: string = path.join(myExtDir, 'pages', 'settings.html');
    const panel = vscode.window.createWebviewPanel('fcSettings', "ForceCode Settings", vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true
    });

    var tempSettings = {};
    var currentSettings = vscode.window.forceCode.config;
    var userNames: string[];

    // And set its HTML content
    panel.webview.html = getSettingsPage();

    const overwriteMerge = (destinationArray, sourceArray, options) => sourceArray;

    // handle settings changes
    panel.webview.onDidReceiveMessage(message => {
        if (message.save) {
            currentSettings = deepmerge(currentSettings, tempSettings, { arrayMerge: overwriteMerge });
            saveConfigFile(currentSettings.username, currentSettings);
            if(currentSettings.username === vscode.window.forceCode.config.username) {
                vscode.window.forceCode.config = currentSettings;
                configuration();
            }
            vscode.window.showInformationMessage('ForceCode settings saved successfully!', 'OK');
        } else if(message.switchUsername && message.username !== currentSettings.username) {
            // the user wants to change settings for another username
            tempSettings = {};
            currentSettings = readConfigFile(message.username);
            panel.webview.postMessage({ currentSettings: currentSettings, userNames: userNames });
        } else {
            tempSettings = deepmerge(tempSettings, message, { arrayMerge: overwriteMerge });
        }
    }, undefined);

    return fcConnection.getSavedUsernames().then(uNames => {
        userNames = uNames;
        panel.webview.postMessage({ currentSettings: currentSettings, userNames: uNames });
    });

    function getSettingsPage(): string {
        return fs.readFileSync(SETTINGS_FILE).toString();
    }
}