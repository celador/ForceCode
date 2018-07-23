import * as vscode from 'vscode';
import { Config } from './../forceCode';
import * as forceCode from './../forceCode';
import * as fs from 'fs-extra';
import * as path from 'path';

export default function getSetConfig(service?: forceCode.IForceService): Promise<Config> {
	return new Promise(function (resolve) {
		var self: forceCode.IForceService = service || vscode.window.forceCode;
		if (!vscode.workspace.workspaceFolders) {
			throw new Error('Open a Folder with VSCode before trying to login to ForceCode');
		}
		try {
			self.config = fs.readJsonSync(vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep + 'force.json');
			if (self.config && self.config !== null && typeof self.config === 'object' && !self.config.src) {
				self.config.src = 'src';
			}
			self.workspaceRoot = `${vscode.workspace.workspaceFolders[0].uri.fsPath}${path.sep}${self.config.src}`;
			if (!fs.existsSync(self.workspaceRoot)) {
				fs.mkdirSync(self.workspaceRoot);
			}
			resolve(self.config);
		} catch (err) {
			self.config = {};
			resolve(self.config);
		}
	});
}
