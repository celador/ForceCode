import * as vscode from 'vscode';
import { ForceService, ForceCodeContentProvider } from './services';
import ApexCompletionProvider from './providers/ApexCompletion';
import { editorDecorator, documentDecorator } from './decorators/testCoverageDecorator';
import * as commands from './commands';
import * as parsers from './parsers';

export function activate(context: vscode.ExtensionContext): any {
    vscode.window.forceCode = new ForceService();

    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('forcecode', new ForceCodeContentProvider()));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.showMenu', () => {
        commands.showMenu(context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.executeAnonymous', () => {
        commands.executeAnonymous(vscode.window.activeTextEditor.document, context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.getLog', () => {
        commands.getLog(context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.open', () => {
        commands.open(context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.retrievePackage', () => {
        commands.retrieve(context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.staticResource', () => {
        commands.staticResource(context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.apexTest', () => {
        commands.apexTest(vscode.window.activeTextEditor.document, context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.compile', () => {
        commands.compile(vscode.window.activeTextEditor.document, context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.diff', () => {
        commands.diff(vscode.window.activeTextEditor.document, context);
    }));

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((textDocument: vscode.TextDocument) => {
        const toolingType: string = parsers.getToolingType(textDocument);
        if (toolingType && vscode.window.forceCode.config && vscode.window.forceCode.config.autoCompile === true) {
            commands.compile(textDocument, context);
        }
        var isResource: RegExpMatchArray = textDocument.fileName.match(/resource\-bundles.*\.resource.*$/); // We are in a resource-bundles folder, bundle and deploy the staticResource
        if (isResource.index && vscode.window.forceCode.config && vscode.window.forceCode.config.autoCompile === true) {
            commands.staticResourceDeployFromFile(textDocument, context);
        }
    }));

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('apex', new ApexCompletionProvider(), '.', '@'));

    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editorDecorator));

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(documentDecorator));


    // // Peek Provider Setup
    // const peekProvider: any = new commands.PeekFileDefinitionProvider();
    // const definitionProvider: any = vscode.languages.registerDefinitionProvider(constants.PEEK_FILTER, peekProvider);
    // context.subscriptions.push(definitionProvider);
}
