import * as vscode from 'vscode';
import { Config } from './../forceCode';
import * as forceCode from './../forceCode';
import * as fs from 'fs-extra';
import * as path from 'path';
import constants from './../models/constants';
import { fcConnection, ForceService } from '.';
import * as deepmerge from 'deepmerge'

export const defautlOptions = {
	apiVersion: constants.API_VERSION,
	autoRefresh: false,
	browser: 'Google Chrome Canary',
	checkForFileChanges: false,
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
	maxQueryHistory: 10,
	maxQueryResultsPerPage: 250,
	outputQueriesAsCSV: true,
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

export default function getSetConfig(service?: ForceService): Promise<Config> {
	var self: forceCode.IForceService = service || vscode.window.forceCode;
	const projPath = self.workspaceRoot;
	var lastUsername: string;
	if(fs.existsSync(path.join(projPath, 'force.json'))) {
		var forceFile = fs.readJsonSync(path.join(projPath, 'force.json'));
		lastUsername = forceFile.lastUsername;
	}
	self.config = readConfigFile(lastUsername, service);
	
	self.projectRoot = path.join(projPath, self.config.src);
	if (!fs.existsSync(self.projectRoot)) {
		fs.mkdirpSync(self.projectRoot);
	}
	if (!fs.existsSync(path.join(projPath, 'sfdx-project.json'))) {
		// add in a bare sfdx-project.json file for language support from official salesforce extensions
		const sfdxProj: {} = {
			namespace: "",
			packageDirectories: [{
				path: 'src',
				default: true
			}],
			sfdcLoginUrl: 'https://login.salesforce.com/',
			sourceApiVersion: constants.API_VERSION,
		};

		fs.outputFileSync(path.join(projPath, 'sfdx-project.json'), JSON.stringify(sfdxProj, undefined, 4));
	}
	return fcConnection.refreshConnections().then(() => {
		return Promise.resolve(self.config);
	});
}

export function saveConfigFile(userName: string, config: Config) {
	fs.outputFileSync(path.join(vscode.window.forceCode.workspaceRoot, '.forceCode',
		userName, 'settings.json'), JSON.stringify(config, undefined, 4));
}

export function readConfigFile(userName: string, service?: ForceService): Config {
	var self: forceCode.IForceService = service || vscode.window.forceCode;
	var config: Config = {}
	if(userName) {
		const configPath: string = path.join(self.workspaceRoot, '.forceCode', 
			userName, 'settings.json');
		if(fs.existsSync(configPath)) {
			config = fs.readJsonSync(configPath);
		} else {
			config.username = userName;
		}
	}
	return deepmerge(defautlOptions, config);
}

export function removeConfigFolder(userName: string): boolean {
	if(userName) {
		const configDir: string = path.join(vscode.window.forceCode.workspaceRoot, '.forceCode', userName);
		if(fs.existsSync(configDir)) {
			fs.removeSync(configDir);
			return true;
		}
	}
	return false;
}
