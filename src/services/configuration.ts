import * as vscode from 'vscode';
import { Config } from './../forceCode';
import * as fs from 'fs-extra';

export default function getSetConfig(): Promise<Config> {
    return new Promise(function (resolve, reject) {
        const slash: string = vscode.window.forceCode.pathSeparator;
        try {
            vscode.window.forceCode.config = fs.readJsonSync(vscode.workspace.rootPath + vscode.window.forceCode.pathSeparator + 'force.json');
            if (typeof vscode.window.forceCode.config === 'object' && !vscode.window.forceCode.config.src) {
                vscode.window.forceCode.config.src = 'src';
            }
            vscode.window.forceCode.config.workspaceRoot = `${vscode.workspace.rootPath}${slash}${vscode.window.forceCode.config.src}${slash}`;
            resolve(vscode.window.forceCode.config);
        } catch (err) {
            vscode.window.forceCode.config = {};
            reject(err);
        }
    });
}
