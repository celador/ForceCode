import * as vscode from 'vscode';
import { Config } from './../forceCode';
import * as forceCode from './../forceCode';
import * as fs from 'fs-extra';

export default function getSetConfig(service?: forceCode.IForceService): Promise<Config> {
    return new Promise(function (resolve, reject) {
        var self: forceCode.IForceService = service || vscode.window.forceCode;
        const slash: string = self.pathSeparator;
        try {
            self.config = fs.readJsonSync(vscode.workspace.rootPath + slash + 'force.json');
            if (typeof self.config === 'object' && !self.config.src) {
                self.config.src = 'src';
            }
            self.config.workspaceRoot = `${vscode.workspace.rootPath}${slash}${self.config.src}${slash}`;
            resolve(self.config);
        } catch (err) {
            self.config = {};
            resolve(self.config);
        }
    });
}