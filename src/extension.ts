import * as vscode from 'vscode';
import { ForceService, commandViewService, commandService } from './services';
import ForceCodeContentProvider from './providers/ContentProvider';
import ForceCodeLogProvider from './providers/LogProvider';
import { editorUpdateApexCoverageDecorator, updateDecorations } from './decorators/testCoverageDecorator';
import * as commands from './models/commands';
import * as parsers from './parsers';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext): any {
    commands.default.forEach(cur => {
        context.subscriptions.push(vscode.commands.registerCommand(cur.commandName, cur.command));
    });

    context.subscriptions.push(vscode.window.registerTreeDataProvider('ForceCode.treeDataProvider', commandViewService));

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
        var curFileId: string = Object.keys(vscode.window.forceCode.workspaceMembers).find(cur => {
            return vscode.window.forceCode.workspaceMembers[cur].path === fileName;
        });
        
        if(curFileId && vscode.window.forceCode.codeCoverage[curFileId]) {
            delete vscode.window.forceCode.codeCoverage[curFileId];
            updateDecorations();
        }
    }));
    
    // Text Coverage Decorators
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editorUpdateApexCoverageDecorator));

    // watch for config file changes
    context.subscriptions.push(vscode.workspace.createFileSystemWatcher(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'force.json')).onDidChange(uri => vscode.window.forceCode.connect(context)));
    
    var timeO;
    // watch for deleted files and update workspaceMembers
    context.subscriptions.push(vscode.workspace.createFileSystemWatcher(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, vscode.window.forceCode.config.src ? vscode.window.forceCode.config.src : 'src', '**/*.{cls,trigger,page,component}')).onDidDelete(uri => {
        var theMember = Object.keys(vscode.window.forceCode.workspaceMembers).find(mem => {
            return vscode.window.forceCode.workspaceMembers[mem].path === uri.fsPath;
        })

        if(theMember) {
            delete vscode.window.forceCode.workspaceMembers[theMember];
            // use a timeout to handle multiple file deletions, this way it only gets called after all files are deleted
            if(timeO) {
                clearTimeout(timeO);
            }
            timeO = setTimeout(() => { vscode.window.forceCode.updateFileMetadata(vscode.window.forceCode.workspaceMembers); }, 1000);
            
        }
    }));

}
