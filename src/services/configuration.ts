import * as vscode from 'vscode';
import { Config } from './../forceCode';
import * as forceCode from './../forceCode';
import * as fs from 'fs-extra';
import * as path from 'path';
var _: any = require('lodash');

export default function getSetConfig(service?: forceCode.IForceService): Promise<Config> {
    return new Promise(function (resolve, reject) {
        var self: forceCode.IForceService = service || vscode.window.forceCode;
        try {
            self.config = _.extend(self.config || {}, fs.readJsonSync(vscode.workspace.rootPath + path.sep + 'force.json'));
            if (typeof self.config === 'object' && !self.config.src) {
                self.config.src = 'src';
            }
            self.workspaceRoot = `${vscode.workspace.rootPath}${path.sep}${self.config.src}`;
            resolve(self.config);
        } catch (err) {
            self.config = {};
            resolve(self.config);
        }
    });
}
