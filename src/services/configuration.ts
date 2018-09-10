import * as vscode from 'vscode';
import { Config } from './../forceCode';
import * as forceCode from './../forceCode';
import * as fs from 'fs-extra';
import * as path from 'path';
import constants from './../models/constants';
import { fcConnection } from '.';

export default function getSetConfig(service?: forceCode.IForceService): Promise<Config> {
	return new Promise(function (resolve) {
		var self: forceCode.IForceService = service || vscode.window.forceCode;
		if (!vscode.workspace.workspaceFolders) {
			throw new Error('Open a Folder with VSCode before trying to login to ForceCode');
		}
		const projPath = vscode.window.forceCode.workspaceRoot + path.sep;
		try {
			self.config = fs.readJsonSync(projPath + 'force.json');
		} catch (err) {
			self.config =  {
				apiVersion: constants.API_VERSION,
				autoRefresh: false,
				browser: 'Google Chrome Canary',
				checkForFileChanges: true,
				debugOnly: true,
				debugFilter: 'USER_DEBUG|FATAL_ERROR',
				deployOptions: {
					'checkOnly': false,
					//'runAllTests': false,
					'ignoreWarnings': true,
				},
				overwritePackageXML: false,
				pollTimeout: 1200,
				showFilesOnOpen: true,
				showFilesOnOpenMax: 3,
				showTestCoverage: true,
				showTestLog: true,
			};			
		}
		if (self.config && self.config !== null && typeof self.config === 'object' && !self.config.src) {
			self.config.src = 'src';
		}
		self.projectRoot = `${projPath}${self.config.src}`;
		if (!fs.existsSync(self.projectRoot)) {
			fs.mkdirpSync(self.projectRoot);
		}
		if(!fs.existsSync(projPath + 'sfdx-project.json')) {
			// add in a bare sfdx-project.json file for language support from official salesforce extensions
			const sfdxProj: {} = {
				namespace: "", 
				sfdcLoginUrl: 'https://login.salesforce.com/', 
				sourceApiVersion: constants.API_VERSION,
			};
			
			fs.outputFileSync(projPath + 'sfdx-project.json', JSON.stringify(sfdxProj, undefined, 4));
		}
		fcConnection.refreshConnections().then(() => {
			resolve(self.config);
		});
	});
}
