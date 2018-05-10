import * as vscode from 'vscode';
import { ForceService, commandViewService, commandService } from './services';
import ForceCodeContentProvider from './providers/ContentProvider';
import ForceCodeLogProvider from './providers/LogProvider';
import { editorUpdateApexCoverageDecorator, documentUpdateApexCoverageDecorator, updateDecorations } from './decorators/testCoverageDecorator';
import * as commands from './models/commands';
import * as parsers from './parsers';

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
        const toolingType: string = parsers.getToolingType(textDocument);
        if (toolingType && vscode.window.forceCode.config && vscode.window.forceCode.config.autoCompile === true) {
            commandService.runCommand('ForceCode.compile', context, textDocument);
        }
        var isResource: RegExpMatchArray = textDocument.fileName.match(/resource\-bundles.*\.resource.*$/); // We are in a resource-bundles folder, bundle and deploy the staticResource
        if (isResource.index && vscode.window.forceCode.config && vscode.window.forceCode.config.autoCompile === true) {
            commandService.runCommand('ForceCode.staticResourceDeployFromFile', context, textDocument);
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
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(documentUpdateApexCoverageDecorator));
}
