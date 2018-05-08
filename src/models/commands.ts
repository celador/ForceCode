import * as vscode from 'vscode';
import * as commands from './../commands';
import { updateDecorations } from '../decorators/testCoverageDecorator';
import { getFileName, getToolingType } from './../parsers';
import { commandService, commandViewService, codeCovViewService, fcConnection, dxService, FCOauth, FCConnection } from './../services';
import * as path from 'path';
import { FCFile } from '../services/codeCovView';
import { ToolingType } from '../commands/retrieve';
import { getAnyTTFromFolder, getAnyNameFromUri } from '../parsers/open';
import { FCCommand } from '../services/commandView';

export const fcCommands: FCCommand[] = [
    {
        commandName: 'ForceCode.openOrg',
        name: 'Opening org in browser',
        hidden: false,
        description: 'Open project org',
        detail: 'Open the org this project is associated with in a browser.',
        icon: 'browser',
        label: 'Open Org in browser',
        command: function (context, selectedResource?) {
            return dxService.openOrg();
        }
    },
    {
        commandName: 'ForceCode.find',
        name: 'Finding in files',
        hidden: false,
        description: 'Find in files',
        detail: 'Search salesforce source files for a string.',
        icon: 'search',
        label: 'Find',
        command: function (context, selectedResource?) {
            return commands.find();
        }
    },
    // Open File
    {
        commandName: 'ForceCode.open',
        name: 'Opening file',
        hidden: false,
        description: 'Open Classes, Pages, Triggers, Components, Lightning Components, and Static Resources',
        detail: 'Retrieve a file from Salesforce.',
        icon: 'desktop-download',
        label: 'Open Salesforce File',
        command: function (context, selectedResource?) {
            return commands.open(context);
        }
    },
    // Create Classes
    {
        commandName: 'ForceCode.createClass',
        name: 'Creating class',
        hidden: false,
        description: 'Create a Repository, Model, Service, Controller, or Custom class.',
        detail: 'Creates classes based on common separation of concerns patterns',
        icon: 'plus',
        label: 'Create Class',
        command: function (context, selectedResource?) {
            return commands.createClass();
        }
    },
    // Execute Anonymous 
    // Execute Selected Code
    {
        commandName: 'ForceCode.executeAnonymous',
        name: 'Executing anonymous code',
        hidden: false,
        description: 'Execute code and get the debug log',
        detail: 'Select some code to run before using this option. You can also right-click after selecting the code.',
        icon: 'terminal',
        label: 'Execute Anonymous',
        command: function (context, selectedResource?) {
            if(!vscode.window.activeTextEditor) {
                return;
            }
            return commands.executeAnonymous(vscode.window.activeTextEditor.document);
        }
    },
    // Get Log(s)
    {
        commandName: 'ForceCode.getLogs',
        name: 'Retrieving logs',
        hidden: false,
        description: 'Display a list of the last ten logs.',
        detail: 'Get recent logs',
        icon: 'unfold',
        label: 'Get Logs',
        command: function (context, selectedResource?) {
            return commands.getLog();
        }
    },
    {
        commandName: 'ForceCode.getOverallCoverage',
        name: 'Retrieving code coverage',
        hidden: false,
        description: 'Get overall code coverage',
        detail: 'Retrieve the current code coverage for all files in the org and save in the coverage folder as a txt file.',
        icon: 'checklist',
        label: 'Get current overall code coverage',
        command: function (context, selectedResource?) {
            return commands.getOverallCoverage();
        }
    },
    // Run SOQL
    {
        commandName: 'ForceCode.soql',
        name: 'Executing SOQL query',
        hidden: false,
        description: 'Run a SOQL query',
        detail: 'The SOQL query results will be dumped to a json file in the soql directory',
        icon: 'telescope',
        label: 'SOQL Query',
        command: function (context, selectedResource?) {
            return commands.soql();
        }
    },
    // Diff Files
    {
        commandName: 'ForceCode.diff',
        name: 'Diffing file', //+ getFileName(vscode.window.activeTextEditor.document),
        hidden: false,
        description: 'Diff the current file with what is on the server',
        detail: 'Diff the file',
        icon: 'diff',
        label: 'Diff',
        command: function (context, selectedResource?) {
            if(selectedResource && selectedResource.path) {
                return vscode.workspace.openTextDocument(selectedResource)
                    .then(doc => commands.diff(doc));
            }
            if(!vscode.window.activeTextEditor) {
                return;
            }
            const ttype: string = getToolingType(vscode.window.activeTextEditor.document);
            return commands.diff(vscode.window.activeTextEditor.document, ttype === 'AuraDefinition');
        }
    },
    // Compile/Deploy
    {
        commandName: 'ForceCode.compileMenu',
        name: 'Saving ',
        hidden: false,
        description: 'Save the active file to your org.',
        detail: 'If there is an error, you will get notified. To automatically compile Salesforce files on save, set the autoCompile flag to true in your settings file',
        icon: 'rocket',
        label: 'Compile/Deploy',
        command: function (context, selectedResource?) {
            if(context) {
                if(context.uri) {
                    context = context.uri;
                }
                return vscode.workspace.openTextDocument(context)
                    .then(doc => { return commands.compile(doc); });
            }
            if(!vscode.window.activeTextEditor) {
                return;
            }
            return commands.compile(vscode.window.activeTextEditor.document);
        }
    },
    {
        commandName: 'ForceCode.compile',
        hidden: true,
        command: function (context, selectedResource?) {
            return commandService.runCommand('ForceCode.compileMenu', context, selectedResource);
        }
    },
    // Build/Deploy Resource Bundle(s)
    {
        commandName: 'ForceCode.staticResource',
        name: 'Retrieving static resource',
        hidden: false,
        description: 'Build and Deploy a resource bundle.',
        detail: 'Create the Static Resource from the resource-bundle folder and deploy it to your org.',
        icon: 'file-zip',
        label: 'Build Resource Bundle',
        command: function (context, selectedResource?) {
            return commands.staticResource(context);
        }
    },
    // Retrieve Package
    {
        commandName: 'ForceCode.retrievePackage',
        name: 'Retrieving package',
        hidden: false,
        description: 'Retrieve metadata to your src directory.',
        detail: 'You will be prompted for the package name or you can choose to retrieve by your package.xml or to retrieve all metadata',
        icon: 'cloud-download',
        label: 'Retrieve Package/Metadata',
        command: function (context, selectedResource?) {
            return commands.retrieve(context);
        }
    },
    // Export Package (Deploy via Metadata API, using Package.xml)
    {
        commandName: 'ForceCode.deployPackage',
        name: 'Deploying package',
        hidden: false,
        description: 'Deploy your package.',
        detail: 'Deploy from a package.xml file or choose files to deploy',
        icon: 'package',
        label: 'Deploy Package',
        command: function (context, selectedResource?) {
            return commands.deploy(context);
        }
    },
    // Run Tooling Query
    {
        commandName: 'ForceCode.toql',
        name: 'Executing TOQL query',
        hidden: false,
        description: 'Run a Tooling API query',
        detail: 'The Tooling API query (Select SymbolTable From ApexClass) results will be dumped to a json file in the toql directory',
        icon: 'telescope',
        label: 'Tooling Query',
        command: function (context, selectedResource?) {
            return commands.toql();
        }
    },
    {
        commandName: 'ForceCode.dx',
        name: 'Running DX command',
        hidden: false,
        description: 'Salesforce DX Commands',
        detail: 'Run DX commands, just like on a command line.',
        icon: 'broadcast',
        label: 'Salesforce DX',
        command: function (context, selectedResource?) {
            return commands.dx();
        }
    },
    {
        commandName: 'ForceCode.codeCompletionRefresh',
        name: 'Refreshing Code Completion',
        hidden: false,
        description: 'Refresh objects from org',
        detail: 'Generate faux sObject classes for apex code completion using the Salesforce apex plugin.',
        icon: 'code',
        label: 'Code Completion Refresh',
        command: function (context, selectedResource?) {
            return commands.codeCompletionRefresh();
        }
    },
    {
        commandName: 'ForceCode.settings',
        name: 'Opening settings',
        hidden: false,
        description: 'Settings',
        detail: 'Change the settings in you force.json via a GUI.',
        icon: 'gear',
        label: 'Settings',
        command: function (context, selectedResource?) {
            return commands.settings();
        }
    },
    {
        commandName: 'ForceCode.logout',
        name: 'Logging out',
        hidden: false,
        description: 'Log out from current org',
        detail: 'Log out of the current org in this project.',
        icon: 'x',
        label: 'Log out of Salesforce',
        command: function (context, selectedResource?) {
            var conn = context ? context : fcConnection.currentConnection;
            return fcConnection.disconnect(conn);
        }
    },
    // Enter Salesforce Credentials
    {
        commandName: 'ForceCode.switchUserText',
        name: 'Logging in',
        hidden: false,
        description: 'Enter the credentials you wish to use.',
        detail: 'Log into an org not in the saved usernames list.',
        icon: 'key',
        label: 'Log in to Salesforce',
        command: function (context, selectedResource?) {
            var orgInfo: FCOauth;
            if(context instanceof FCConnection) {
                orgInfo = context.orgInfo;
            } else {
                orgInfo = context;
            }
            return fcConnection.connect(orgInfo).then(() => {
                codeCovViewService.clear();
            });
        }
    },
    {
        commandName: 'ForceCode.switchUser',
        hidden: true,
        command: function (context, selectedResource?) {
            return commandService.runCommand('ForceCode.switchUserText', context, selectedResource);
        }
    },
    {
        commandName: 'ForceCode.refresh',
        hidden: true,
        command: function (context, selectedResource?) {
            return commandService.runCommand('ForceCode.refreshContext', context, selectedResource);
        }
    },
    {
        commandName: 'ForceCode.refreshContext',
        name: 'Retrieving file',
        hidden: true,
        command: function (context, selectedResource?) {
            return commandService.runCommand('ForceCode.refreshContext', context, selectedResource);
        }
    },
    {
        commandName: 'ForceCode.refreshContext',
        name: 'Retrieving ',
        hidden: true,
        command: function (context, selectedResource?) {
            if(selectedResource && selectedResource instanceof Array) {
                var files: ToolingType[] = [];
                selectedResource.forEach(curRes => {
                    var tType: string = getAnyTTFromFolder(curRes);
                    var index: number = getTTIndex(tType, files);
                    const theName: string = getAnyNameFromUri(curRes);
                    if(index >= 0) {
                        if(theName === '*') {
                            files[index].members = ['*'];
                        } else {
                            files[index].members.push(theName);
                        }
                    } else {
                        files.push({name: tType, members: [theName]});
                    }
                });

                return commands.retrieve({types: files});
            }
            if(context) {
                return commands.retrieve(context);
            }
            if(!vscode.window.activeTextEditor) {
                return undefined;
            }
            return commands.retrieve(vscode.window.activeTextEditor.document.uri);

            function getTTIndex(toolType: string, arr: ToolingType[]): number {
                return arr.findIndex(cur => {
                    return cur.name === toolType && cur.members !== ['*'];
                });
            }
        }
    },
    {
        commandName: 'ForceCode.showMenu',
        hidden: true,
        command: function (context, selectedResource?) {
            return commands.showMenu(context);
        }
    },
    {
        commandName: 'ForceCode.toggleCoverage',
        hidden: true,
        command: function (context, selectedResource?) {
            vscode.window.forceCode.config.showTestCoverage = !vscode.window.forceCode.config.showTestCoverage;
            return updateDecorations();
        }
    },
    {
        commandName: 'ForceCode.previewVF',
        hidden: true,
        command: function(context, selectedResource?) {
            var vfFileNameSplit = context.fsPath.split(path.sep);
            var vfFileName = vfFileNameSplit[vfFileNameSplit.length - 1].split('.')[0];
            return dxService.openOrgPage('/apex/' + vfFileName);
        }
    },
    {
        commandName: 'ForceCode.previewApp',
        hidden: true,
        command: function(context, selectedResource?) {
            var appFileNameSplit = context.fsPath.split(path.sep);
            var appFileName = appFileNameSplit[appFileNameSplit.length - 1];
            return dxService.openOrgPage('/c/' + appFileName);
        }
    },
    {
        commandName: 'ForceCode.openFileInOrg',
        hidden: true,
        command: function(context, selectedResource?) {
            if(context) {
                var filePath = context.fsPath;
                const fcfile: FCFile = codeCovViewService.findByPath(filePath);
                
                return dxService.openOrgPage('/' + fcfile.getWsMember().id);
            } else {
                return Promise.resolve();
            }
        }
    },
    {
        commandName: 'ForceCode.showFileOptions',
        name: 'Opening file',
        hidden: true,
        command: function (context, selectedResource?) {
            return commands.showFileOptions(context);
        }
    },
    {
        commandName: 'ForceCode.apexTest',
        name: 'Running apex test',
        hidden: true,
        command: function (context, selectedResource?) {
            return commands.apexTest(context, selectedResource);
        }
    },
    {
        commandName: 'ForceCode.fileModified',
        name: 'Modified file',
        hidden: true,
        command: function (context, selectedResource?) {
            return vscode.workspace.openTextDocument(context).then(theDoc => {
                return vscode.window.showWarningMessage(selectedResource + ' has changed ' + getFileName(theDoc), 'Refresh', 'Diff', 'Dismiss').then(s => {
                    if (s === 'Refresh') {
                        return commands.retrieve(theDoc.uri);
                    } else if(s === 'Diff') {
                        return commands.diff(theDoc);
                    }
                });
            });
        }
    },
    {
        commandName: 'ForceCode.staticResourceDeployFromFile',
        name: 'Saving static resource',
        hidden: true,
        command: function (context, selectedResource?) {
            return commands.staticResourceDeployFromFile(selectedResource, context);
        }
    },
    {
        commandName: 'ForceCode.checkForFileChanges',
        name: 'Getting workspace information',
        hidden: true,
        command: function (context, selectedResource?) {
            return vscode.window.forceCode.checkForFileChanges();
        }
    },
    {
        commandName: 'ForceCode.showTasks',
        name: 'Show tasks',
        hidden: true,
        command: function (context, selectedResource?) {
            var treePro = vscode.window.createTreeView('ForceCode.treeDataProvider', {treeDataProvider: commandViewService});
            return treePro.reveal(commandViewService.getChildren()[0]);
        }
    },
    {
        commandName: 'ForceCode.openOnClick',
        name: 'Open From TestCov view',
        hidden: true,
        command: function (context, selectedResource?) {
            return vscode.workspace.openTextDocument(context).then(doc => vscode.window.showTextDocument(doc, { preview: false }));
        }
    },
    {
        commandName: 'ForceCode.getCodeCoverage',
        name: 'Retriving code coverage',
        hidden: true,
        command: function (context, selectedResource?) {
            return commands.apexTestResults();
        }
    },
    {
        commandName: 'ForceCode.runTests', //'sfdx.force.apex.test.class.run.delegate',
        hidden: true,
        command: function (context, selectedResource?) {
            return commandService.runCommand('ForceCode.apexTest', context.name, context.type);
        }
    },
    {
        commandName: 'ForceCode.login',
        hidden: true,
        command: function (context, selectedResource?) {
            var orgInfo: FCOauth;
            if(context instanceof FCConnection) {
                orgInfo = context.orgInfo;
            } else {
                orgInfo = context;
            }
            return dxService.login(orgInfo.loginUrl)
                .then(res => {
                    return commandService.runCommand('ForceCode.switchUserText', res);
                });
        }
    },
    {
        commandName: 'ForceCode.showFileOptions',
        name: 'Opening file',
        hidden: true,
        command: function (context, selectedResource?) {
            return commands.showFileOptions(context);
        }
    },
    {
        commandName: 'ForceCode.apexTest',
        name: 'Running apex test',
        hidden: true,
        command: function (context, selectedResource?) {
            return commands.apexTest(context, selectedResource);
        }
    },
    {
        commandName: 'ForceCode.fileModified',
        name: 'Modified file',
        hidden: true,
        command: function (context, selectedResource?) {
            return vscode.workspace.openTextDocument(context).then(theDoc => {
                return vscode.window.showWarningMessage('Someone else has changed ' + getFileName(theDoc), 'Refresh', 'Diff', 'Dismiss').then(s => {
                    if (s === 'Refresh') {
                        return commands.retrieve(selectedResource, theDoc.uri);
                    } else if(s === 'Diff') {
                        return commands.diff(theDoc, selectedResource);
                    }
                });
            });
        }
    },
    {
        commandName: 'ForceCode.staticResourceDeployFromFile',
        name: 'Saving static resource',
        hidden: true,
        command: function (context, selectedResource?) {
            return commands.staticResourceDeployFromFile(selectedResource, context);
        }
    },
]
