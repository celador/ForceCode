import * as vscode from 'vscode';
import * as commands from './../commands';
import { updateDecorations } from '../decorators/testCoverageDecorator';

export default [
    {
        name: 'ForceCode.openOrg',
        hidden: false,
        description: 'Open project org',
        detail: 'Open the org this project is associated with in a browser.',
        icon: 'browser',
        label: 'Open Org in browser',
        command: function (context, selectedResource?: vscode.Uri) {
            return vscode.window.forceCode.dxCommands.openOrg();
        }
    },
    {
        name: 'ForceCode.find',
        hidden: false,
        description: 'Find in files',
        detail: 'Search salesforce source files for a string.',
        icon: 'search',
        label: 'Find',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.find();
        }
    },
    // Open File
    {
        name: 'ForceCode.open',
        hidden: false,
        description: 'Open Classes, Pages, Triggers, and Components',
        detail: 'Open a file from the cloud (aka "refresh from org").',
        icon: 'desktop-download',
        label: 'Open Salesforce File',
        command: function (context, selectedResource?: vscode.Uri) {
            vscode.window.forceCode.runCommand('ForceCode.compile', context, selectedResource);
            return commands.open(context);
        }
    },
    // Create Classes
    {
        name: 'ForceCode.createClass',
        hidden: false,
        description: 'Create a Repository, Model, Service, Controller, or Custom class.',
        detail: 'Creates classes based on common separation of concerns patterns',
        icon: 'plus',
        label: 'Create Class',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.createClass(context);
        }
    },
    // Execute Anonymous 
    // Execute Selected Code
    {
        name: 'ForceCode.executeAnonymous',
        hidden: false,
        description: 'Execute code and get the debug log',
        detail: 'If you have a block of text selected, it will run that, otherwise it will use the text of the active file.',
        icon: 'terminal',
        label: 'Execute Anonymous',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.executeAnonymous(vscode.window.activeTextEditor.document, context);
        }
    },
    // Get Log(s)
    {
        name: 'ForceCode.getLogs',
        hidden: false,
        description: 'Display a list of the last ten logs.',
        detail: 'Get recent logs',
        icon: 'unfold',
        label: 'Get Logs',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.getLog(context);
        }
    },
    {
        name: 'ForceCode.getCodeCoverage',
        hidden: false,
        description: 'Get code coverage',
        detail: 'Retrieve the current code coverage for all files in the src folder.',
        icon: 'file-text',
        label: 'Get current code coverage',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.apexTestResults();
        }
    },
    {
        name: 'ForceCode.getOverallCoverage',
        hidden: false,
        description: 'Get overall code coverage',
        detail: 'Retrieve the current code coverage for all files in the org and save in the coverage folder as a txt file.',
        icon: 'checklist',
        label: 'Get current overall code coverage',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.getOverallCoverage();
        }
    },
    // Run SOQL
    {
        name: 'ForceCode.soql',
        hidden: false,
        description: 'Run a SOQL query',
        detail: 'The SOQL query results will be dumped to a json file in the soql directory',
        icon: 'telescope',
        label: 'SOQL Query',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.soql();
        }
    },
    // Diff Files
    {
        name: 'ForceCode.diff',
        hidden: false,
        description: 'Diff the current file with what is on the server',
        detail: 'Diff the file',
        icon: 'diff',
        label: 'Diff',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.diff(vscode.window.activeTextEditor.document, context);
        }
    },
    // Compile/Deploy
    {
        name: 'ForceCode.compile',
        hidden: false,
        description: 'Save the active file to your org.',
        detail: 'If there is an error, you will get notified. To automatically compile Salesforce files on save, set the autoCompile flag to true in your settings file',
        icon: 'rocket',
        label: 'Compile/Deploy',
        command: function (context, selectedResource?: vscode.Uri) {
            if (selectedResource && selectedResource.path) {
                return vscode.workspace.openTextDocument(selectedResource)
                    .then(doc => commands.compile(doc, context));
            } else {
                return commands.compile(vscode.window.activeTextEditor.document, context);
            }
        }
    },
    // Build/Deploy Resource Bundle(s)
    {
        name: 'ForceCode.staticResource',
        hidden: false,
        description: 'Build and Deploy a resource bundle.',
        detail: 'Create the Static Resource from the resource-bundle folder and deploy it to your org.',
        icon: 'file-zip',
        label: 'Build Resource Bundle',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.staticResource(context);
        }
    },
    // Retrieve Package
    {
        name: 'ForceCode.retrievePackage',
        hidden: false,
        description: 'Retrieve metadata to your src directory.',
        detail: 'You will be prompted for the package name or you can choose to retrieve by your package.xml or to retrieve all metadata',
        icon: 'cloud-download',
        label: 'Retrieve Package/Metadata',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.retrieve(context);
        }
    },
    // Export Package (Deploy via Metadata API, using Package.xml)
    {
        name: 'ForceCode.deployPackage',
        hidden: false,
        description: 'Deploy your package.',
        detail: 'If you have a directory with a package.xml, you will get the option to deploy it.',
        icon: 'package',
        label: 'Deploy Package',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.deploy(context);
        }
    },
    // Run Tooling Query
    {
        name: 'ForceCode.toql',
        hidden: false,
        description: 'Run a Tooling API query',
        detail: 'The Tooling API query (Select SymbolTable From ApexClass) results will be dumped to a json file in the toql directory',
        icon: 'telescope',
        label: 'Tooling Query',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.toql();
        }
    },
    {
        name: 'ForceCode.dx',
        hidden: false,
        description: 'Salesforce DX Commands',
        detail: 'Run DX commands, just like on a command line.',
        icon: 'broadcast',
        label: 'Salesforce DX',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.dx();
        }
    },
    {
        name: 'ForceCode.codeCompletionRefresh',
        hidden: false,
        description: 'Refresh objects from org',
        detail: 'You must login to DX first or if you receive errors. Allows code completion with custom fields and objects by downloading org data.',
        icon: 'code',
        label: 'Code Completion Refresh',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.codeCompletionRefresh();
        }
    },
    {
        name: 'ForceCode.dxLogout',
        hidden: false,
        description: 'Log out from current org',
        detail: 'Log out of the current org in this project.',
        icon: 'x',
        label: 'Log out of Salesforce',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.dxLogout();
        }
    },
    // Enter Salesforce Credentials
    {
        name: 'ForceCode.enterCredentials',
        hidden: false,
        description: 'Enter the credentials you wish to use.',
        detail: 'If you are already logged in, you will be logged out of your previous session.',
        icon: 'key',
        label: 'Log in to Salesforce',
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.credentials();
        }
    },
    {
        name: 'ForceCode.refresh',
        hidden: true,
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.retrieve(context, selectedResource);
        }
    },
    {
        name: 'ForceCode.showMenu',
        hidden: true,
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.showMenu(context);
        }
    },
    {
        name: 'ForceCode.documentMethod',
        hidden: true,
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.documentMethod(context);
        }
    },
    {
        name: 'ForceCode.toggleCoverage',
        hidden: true,
        command: function (context, selectedResource?: vscode.Uri) {
            vscode.window.forceCode.config.showTestCoverage = !vscode.window.forceCode.config.showTestCoverage;
            return updateDecorations();
        }
    },
    {
        name: 'sfdx.force.apex.test.class.run.delegate',
        hidden: true,
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.apexTestClass(context);
        }
    },
    {
        name: 'sfdx.force.apex.test.method.run.delegate',
        hidden: true,
        command: function (context, selectedResource?: vscode.Uri) {
            return commands.apexTestMethod(context);
        }
    },
]
