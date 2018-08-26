import * as vscode from 'vscode';
import { Config } from './../forceCode';
import * as forceCode from './../forceCode';
import * as fs from 'fs-extra';
import * as path from 'path';
import constants from './../models/constants';

export default function getSetConfig(service?: forceCode.IForceService): Promise<Config> {
	return new Promise(function (resolve) {
		var self: forceCode.IForceService = service || vscode.window.forceCode;
		const projPath = vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep;
		if(!fs.existsSync(projPath + 'sfdx-project.json')) {
			// add in a bare sfdx-project.json file for language support from official salesforce extensions
			const sfdxProj: {} = {
				namespace: "", 
				sfdcLoginUrl: 'https://login.salesforce.com/', 
				sourceApiVersion: constants.API_VERSION,
			};
			
			fs.outputFileSync(projPath + 'sfdx-project.json', JSON.stringify(sfdxProj, undefined, 4));
		}
		if (!vscode.workspace.workspaceFolders) {
			throw new Error('Open a Folder with VSCode before trying to login to ForceCode');
		}
		try {
			self.config = fs.readJsonSync(projPath + 'force.json');
			if (self.config && self.config !== null && typeof self.config === 'object' && !self.config.src) {
				self.config.src = 'src';
			}
			self.workspaceRoot = `${projPath}${self.config.src}`;
			if (!fs.existsSync(self.workspaceRoot)) {
				fs.mkdirSync(self.workspaceRoot);
			}
			resolve(self.config);
		} catch (err) {
			self.config =  {
				checkForFileChanges: true,
				autoRefresh: false,
				showTestCoverage: true,
				showTestLog: true,
				showFilesOnOpen: true,
				showFilesOnOpenMax: 3,
				browser: 'Google Chrome Canary',
				pollTimeout: 1200,
				debugOnly: true,
				debugFilter: 'USER_DEBUG|FATAL_ERROR',
				apiVersion: constants.API_VERSION,
				deployOptions: {
					'checkOnly': false,
					'runAllTests': false,
					'ignoreWarnings': true,
				},
				overwritePackageXML: false,
			};			
			resolve(self.config);
		}
	});
}
