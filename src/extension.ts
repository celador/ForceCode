import * as vscode from 'vscode';
import { ForceService, commandViewService, commandService, codeCovViewService, configuration, switchUserViewService, operatingSystem } from './services';
import ForceCodeContentProvider from './providers/ContentProvider';
import ForceCodeLogProvider from './providers/LogProvider';
import { editorUpdateApexCoverageDecorator, updateDecorations } from './decorators/testCoverageDecorator';
import * as commands from './models/commands';
import * as parsers from './parsers';
import * as path from 'path';
import { FCFile } from './services/codeCovView';
import { IWorkspaceMember } from './forceCode';
import { ApexTestLinkProvider } from './providers/ApexTestLinkProvider';
import { getToolingTypeFromFolder, getAnyTTFromFolder } from './parsers/open';

export function activate(context: vscode.ExtensionContext): any {
    commands.default.forEach(cur => {
        context.subscriptions.push(vscode.commands.registerCommand(cur.commandName, cur.command));
    });

    context.subscriptions.push(vscode.window.registerTreeDataProvider('ForceCode.switchUserProvider', switchUserViewService));
    context.subscriptions.push(vscode.window.registerTreeDataProvider('ForceCode.treeDataProvider', commandViewService));
    context.subscriptions.push(vscode.window.registerTreeDataProvider('ForceCode.codeCovDataProvider', codeCovViewService));

    vscode.window.forceCode = new ForceService();
    
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('sflog', new ForceCodeLogProvider()));
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('forcecode', ForceCodeContentProvider.getInstance()));

    let sel: vscode.DocumentSelector = { scheme: 'file', language: 'apex' };
    context.subscriptions.push(vscode.languages.registerHoverProvider(sel, new ApexTestLinkProvider()));

    // AutoCompile Feature
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((textDocument: vscode.TextDocument) => {
        if (vscode.window.forceCode.config && vscode.window.forceCode.config.autoCompile === true) {
            var isResource: RegExpMatchArray = textDocument.fileName.match(/resource\-bundles.*\.resource.*$/); // We are in a resource-bundles folder, bundle and deploy the staticResource
            const toolingType: string = getAnyTTFromFolder(textDocument.uri);
            console.log(toolingType);
            if(textDocument.uri.fsPath.indexOf(vscode.window.forceCode.workspaceRoot) !== -1) {
                if (isResource && isResource.index) {
                    return commandService.runCommand('ForceCode.staticResourceDeployFromFile', context, textDocument);
                }
                if(toolingType) {
                    return commandService.runCommand('ForceCode.compileMenu', textDocument);
                }
            } else if(isResource || toolingType) {
                vscode.window.showErrorMessage('The file you are trying to save to the server isn\'t in the current org\'s source folder (' + vscode.window.forceCode.workspaceRoot + ')');
            }
        }
    }));

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(function(event) {
        // clear the code coverage
        var fileName = event.document.fileName;
        // get the id
        const fcfile: FCFile = codeCovViewService.findByPath(fileName);
        var wsMem: IWorkspaceMember = fcfile ? fcfile.getWsMember() : undefined;
        
        if(fcfile && wsMem && wsMem.coverage) {
            wsMem.coverage = undefined;
            fcfile.updateWsMember(wsMem);
            updateDecorations();
        }
    }));
    
    // Text Coverage Decorators
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editorUpdateApexCoverageDecorator));

    if (!vscode.workspace.workspaceFolders) {
        throw new Error('Open a Folder with VSCode before trying to login to ForceCode');
    }

    // watch for config file changes
    context.subscriptions.push(vscode.workspace.createFileSystemWatcher(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'force.json')).onDidChange(uri => { configuration() }));
    
    // watch for deleted files and update workspaceMembers
    context.subscriptions.push(vscode.workspace.createFileSystemWatcher(path.join(vscode.window.forceCode.workspaceRoot, '**', '*.{cls,trigger,page,component,cmp}')).onDidDelete(uri => {
        const fcfile: FCFile = codeCovViewService.findByPath(uri.fsPath);

        if(fcfile) {
            codeCovViewService.removeClass(fcfile);
        }
    }));

    // need this because windows won't tell us when a dir is removed like linux/mac does above
    if(operatingSystem.isWindows()) {
        context.subscriptions.push(vscode.workspace.createFileSystemWatcher(path.join(vscode.window.forceCode.workspaceRoot, '*')).onDidDelete(uri => {
            const tType: string = getToolingTypeFromFolder(uri);
            if(tType) {
                const fcfiles: FCFile[] = codeCovViewService.findByType(tType);
                if(fcfiles) {
                    codeCovViewService.removeClasses(fcfiles);
                }
            }
        }));
    }
}
