import * as vscode from 'vscode';
import { ForceService, commandViewService, commandService, codeCovViewService } from './services';
import ForceCodeContentProvider from './providers/ContentProvider';
import ForceCodeLogProvider from './providers/LogProvider';
import { editorUpdateApexCoverageDecorator, updateDecorations } from './decorators/testCoverageDecorator';
import * as commands from './models/commands';
import * as sfdxCommands from './models/sfdxCommands';
import * as parsers from './parsers';
import * as path from 'path';
import { FCFile } from './services/codeCovView';
import { IWorkspaceMember } from './forceCode';

export function activate(context: vscode.ExtensionContext): any {
    commands.default.forEach(cur => {
        context.subscriptions.push(vscode.commands.registerCommand(cur.commandName, cur.command));
    });

    context.subscriptions.push(vscode.window.registerTreeDataProvider('ForceCode.treeDataProvider', commandViewService));
    context.subscriptions.push(vscode.window.registerTreeDataProvider('ForceCode.codeCovDataProvider', codeCovViewService));

    vscode.window.forceCode = new ForceService();
    
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('sflog', new ForceCodeLogProvider()));
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('forcecode', new ForceCodeContentProvider()));

    // AutoCompile Feature
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((textDocument: vscode.TextDocument) => {
        if (vscode.window.forceCode.config && vscode.window.forceCode.config.autoCompile === true) {
            const toolingType: string = parsers.getToolingType(textDocument);
            if(toolingType) {
                commandService.runCommand('ForceCode.compileMenu', context, textDocument);
            }
            var isResource: RegExpMatchArray = textDocument.fileName.match(/resource\-bundles.*\.resource.*$/); // We are in a resource-bundles folder, bundle and deploy the staticResource
            if (isResource.index) {
                commandService.runCommand('ForceCode.staticResourceDeployFromFile', context, textDocument);
            }
        }
    }));

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(function(event) {
        // clear the code coverage
        var fileName = event.document.fileName;
        // get the id
        const fcfile: FCFile = codeCovViewService.findByPath(fileName);
        var wsMem: IWorkspaceMember = fcfile ? fcfile.getWsMember() : undefined;
        
        if(fcfile && wsMem.coverage) {
            wsMem.coverage = undefined;
            codeCovViewService.addOrUpdateClass(wsMem);
            updateDecorations();
        }
    }));
    
    // Text Coverage Decorators
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editorUpdateApexCoverageDecorator));

    if (!vscode.workspace.workspaceFolders) {
        return;
    }

    // watch for config file changes
    context.subscriptions.push(vscode.workspace.createFileSystemWatcher(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'force.json')).onDidChange(uri => { if(vscode.window.forceCode.dxCommands.isLoggedIn) { vscode.window.forceCode.connect(context) }}));
    
    var timeO;
    // watch for deleted files and update workspaceMembers
    context.subscriptions.push(vscode.workspace.createFileSystemWatcher(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, vscode.window.forceCode.config.src ? vscode.window.forceCode.config.src : 'src', '**/*.{cls,trigger,page,component}')).onDidDelete(uri => {
        const fcfile: FCFile = codeCovViewService.findByPath(uri.path);

        if(fcfile) {
            codeCovViewService.removeClass(fcfile);
            // use a timeout to handle multiple file deletions, this way it only gets called after all files are deleted
            if(timeO) {
                clearTimeout(timeO);
            }
            timeO = setTimeout(() => { codeCovViewService.saveClasses(); }, 1000);
            
        }
    }));

    vscode.commands.getCommands(true).then(coms => {
        if(!coms.find(curCom => { return curCom === 'sfdx.force.apex.test.class.run.delegate' || curCom === 'sfdx.force.apex.test.method.run.delegate' })) {
            sfdxCommands.default.forEach(cur => {
                context.subscriptions.push(vscode.commands.registerCommand(cur.commandName, cur.command));
            });
        }
    });

    if(!vscode.window.forceCode.config.handleMetaFiles) {
        var index: number = commands.default.findIndex(cur => { return cur.commandName === 'ForceCode.retrievePackage'});
        commands.default[index].hidden = true;
        index = commands.default.findIndex(cur => { return cur.commandName === 'ForceCode.deployPackage'});
        commands.default[index].hidden = true;
    }
}
