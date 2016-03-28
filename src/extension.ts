import * as vscode from 'vscode';
import {IForceService} from './forceCode';
import {ForceService} from './services';
import * as commands from './commands';
import * as parsers from './parsers';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): any {
    'use strict';
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('ForceCode is now active!');
    vscode.window.forceCode = new ForceService();
    vscode.window.forceCode.outputChannel = vscode.window.createOutputChannel('ForceCode');
    // this.conn = new jsforce.Connection();
    /// TODO: Pull credentials from .config jsforce.config.js file from the user directory
    vscode.window.forceCode.config = vscode.workspace.getConfiguration('sfdc');

    // // // Peek Provider Setup
    // // const peekProvider: any = new commands.PeekFileDefinitionProvider();
    // // const definitionProvider: any = vscode.languages.registerDefinitionProvider(constants.PEEK_FILTER, peekProvider);
    // // context.subscriptions.push(definitionProvider);

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.executeAnonymous', () => {
        commands.executeAnonymous(vscode.window.activeTextEditor.document);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.getLog', () => {
        commands.getLog();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.compile', () => {
        commands.compile(vscode.window.activeTextEditor.document);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.open', () => {
        commands.open();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.exportPackage', () => {
        commands.retrieve();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.staticResource', () => {
        const config: any = vscode.workspace.getConfiguration('sfdc');
        commands.staticResource(vscode.window.activeTextEditor.document, config.deployStaticResource);
    }));

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((textDocument: vscode.TextDocument) => {
        const toolingType: string = parsers.getToolingType(textDocument);
        const config: any = vscode.window.forceCode.config;
        if (toolingType !== undefined && config.autoCompile === true) {
            commands.compile(textDocument);
        }
    }));
}
