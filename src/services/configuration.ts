import * as vscode from 'vscode';
import { Config } from './../forceCode';
import * as forceCode from './../forceCode';
import * as fs from 'fs-extra';
import * as path from 'path';
import constants from './../models/constants';
import { fcConnection } from '.';
import * as deepmerge from 'deepmerge'
import { getPreviousUUID } from './fcAnalytics';

export const defautlOptions = {
	apiVersion: constants.API_VERSION,
	autoRefresh: false,
	browser: 'Google Chrome Canary',
	checkForFileChanges: true,
	debugFilter: 'USER_DEBUG|FATAL_ERROR',
	debugOnly: true,
	deployOptions: {
		'allowMissingFiles': true,
		'checkOnly': false,
		'ignoreWarnings': true,
		'purgeOnDelete': false,
		'rollbackOnError': true,
		'runTests': [],
		'singlePackage': true,
		'testLevel': 'NoTestRun'
	},
	maxFileChangeNotifications: 15,
	outputQueriesAsCSV: false,
	overwritePackageXML: false,
	poll: 1500,
	pollTimeout: 1200,
	prefix: '',
	revealTestedClass: false,
	showFilesOnOpen: true,
	showFilesOnOpenMax: 3,
	showTestCoverage: true,
	showTestLog: true,
	spaDist: '',
	src: 'src',
	staticResourceCacheControl: 'Private',
};

export default function getSetConfig(service?: forceCode.IForceService): Promise<Config> {
	var self: forceCode.IForceService = service || vscode.window.forceCode;
	if (!vscode.workspace.workspaceFolders) {
		throw new Error('Open a Folder with VSCode before trying to login to ForceCode');
	}
	const projPath = vscode.window.forceCode.workspaceRoot;
	var lastUsername: string;
	if(fs.existsSync(path.join(projPath, 'force.json'))) {
		var forceFile = fs.readJsonSync(path.join(projPath, 'force.json'));
		lastUsername = forceFile.lastUsername;
	}
	self.config = readConfigFile(lastUsername);
	
	var analyticsFileExists: boolean = true;
	if(!fs.existsSync(path.join(vscode.window.forceCode.storageRoot, 'analytics.json'))) {
		analyticsFileExists = getPreviousUUID();
	} 
	if(analyticsFileExists) {
		vscode.window.forceCode.uuid = fs.readJsonSync(path.join(vscode.window.forceCode.storageRoot, 'analytics.json')).uuid;
	}

	self.projectRoot = path.join(projPath, self.config.src);
	if (!fs.existsSync(self.projectRoot)) {
		fs.mkdirpSync(self.projectRoot);
	}
	if (!fs.existsSync(path.join(projPath, 'sfdx-project.json'))) {
		// add in a bare sfdx-project.json file for language support from official salesforce extensions
		const sfdxProj: {} = {
			namespace: "",
			sfdcLoginUrl: 'https://login.salesforce.com/',
			sourceApiVersion: constants.API_VERSION,
		};

		fs.outputFileSync(path.join(projPath, 'sfdx-project.json'), JSON.stringify(sfdxProj, undefined, 4));
	}
	return fcConnection.refreshConnections().then(() => {
		return Promise.resolve(self.config);
	});
}

export function saveConfigFile(userName) {
	fs.outputFileSync(path.join(vscode.window.forceCode.workspaceRoot, '.forceCode',
		userName, 'settings.json'), 
		JSON.stringify(vscode.window.forceCode.config, undefined, 4));
}

export function readConfigFile(userName): Config {
	var config: Config = {}
	if(userName) {
		const configPath: string = path.join(vscode.window.forceCode.workspaceRoot, '.forceCode', 
			userName, 'settings.json');
		if(fs.existsSync(configPath)) {
			config = fs.readJsonSync(configPath);
		}
	}
	return deepmerge(defautlOptions, config);
}
