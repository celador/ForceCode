import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as deepmerge from 'deepmerge'

export default function settings(): Promise<any> {
    const myExtDir = vscode.extensions.getExtension ("BrettWagner.forcecode").extensionPath;
    const SETTINGS_FILE: string = path.join(myExtDir, 'pages', 'settings.html');
    const panel = vscode.window.createWebviewPanel('fcSettings', "ForceCode Settings", vscode.ViewColumn.One, { 
        enableScripts: true,
        retainContextWhenHidden: true
     });

    // And set its HTML content
    panel.webview.html = getSettingsPage();

    panel.webview.postMessage(vscode.window.forceCode.config);

    // handle settings changes
    panel.webview.onDidReceiveMessage(message => {
        vscode.window.forceCode.config = deepmerge(vscode.window.forceCode.config, message);
    }, undefined);

    // save the settings on close
    panel.onDidDispose(() => {
        fs.outputFileSync(path.join(vscode.window.forceCode.workspaceRoot, 'force.json'), JSON.stringify(vscode.window.forceCode.config, undefined, 4));
    });

    return Promise.resolve();


    function getSettingsPage(): string {
        return fs.readFileSync(SETTINGS_FILE).toString();
    }
}