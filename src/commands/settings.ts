import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as deepmerge from 'deepmerge'
import { saveConfigFile } from '../services/configuration';
import { configuration } from '../services';

export default function settings(): Promise<any> {
    const myExtDir = vscode.extensions.getExtension("JohnAaronNelson.forcecode").extensionPath;
    const SETTINGS_FILE: string = path.join(myExtDir, 'pages', 'settings.html');
    const panel = vscode.window.createWebviewPanel('fcSettings', "ForceCode Settings", vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true
    });

    var tempSettings = {};

    // And set its HTML content
    panel.webview.html = getSettingsPage();

    panel.webview.postMessage(vscode.window.forceCode.config);

    const overwriteMerge = (destinationArray, sourceArray, options) => sourceArray;

    // handle settings changes
    panel.webview.onDidReceiveMessage(message => {
        if (message.save) {
            vscode.window.forceCode.config = deepmerge(vscode.window.forceCode.config, tempSettings, { arrayMerge: overwriteMerge });
            saveConfigFile(vscode.window.forceCode.config.username);
            configuration();
            vscode.window.showInformationMessage('ForceCode settings saved successfully!', 'OK');
        } else {
            tempSettings = deepmerge(tempSettings, message, { arrayMerge: overwriteMerge });
        }
    }, undefined);

    return Promise.resolve();

    function getSettingsPage(): string {
        return fs.readFileSync(SETTINGS_FILE).toString();
    }
}