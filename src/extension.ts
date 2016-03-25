// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {IForceService} from './forceCode';
import * as commands from './commands';
import * as parsers from './parsers';
import {ForceService, constants} from './services';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): any {
    'use strict';
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('ForceCode is now active!');
    const forceService: IForceService = new ForceService();

    // Peek Provider Setup
    const peekProvider: any = new commands.PeekFileDefinitionProvider();
    const definitionProvider: any = vscode.languages.registerDefinitionProvider(constants.PEEK_FILTER, peekProvider);
    context.subscriptions.push(definitionProvider);

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.executeAnonymous', () => {
        commands.executeAnonymous(forceService, vscode.window.activeTextEditor.document);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.getLog', () => {
        commands.getLog(forceService);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.compile', () => {
        commands.compile(forceService, vscode.window.activeTextEditor.document);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.open', () => {
        commands.open(forceService);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.exportPackage', () => {
        commands.retrieve(forceService);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.staticResource', () => {
        const config: any = vscode.workspace.getConfiguration('sfdc');
        commands.staticResource(forceService, vscode.window.activeTextEditor.document, config.deployStaticResource);
    }));

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((textDocument: vscode.TextDocument) => {
        const toolingType: string = parsers.getToolingType(textDocument);
        const config: any = vscode.workspace.getConfiguration('sfdc');
        if (forceService.conn && toolingType !== undefined && config.autoCompile === true) {
            commands.compile(forceService, textDocument);
        }
    }));
}
