// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fc from './commands';
import * as parsers from './parsers';
import {IForceService, ForceService} from './services';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): any {
    'use strict';
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('ForceCode is now active!');
    const forceService: IForceService = new ForceService();

    // The commands have been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.executeAnonymous', () => {
        fc.executeAnonymous(forceService, vscode.window.activeTextEditor.document);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.getLog', () => {
        fc.getLog(forceService);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.compile', () => {
        fc.compile(forceService, vscode.window.activeTextEditor.document);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.open', () => {
        fc.open(forceService);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.exportPackage', () => {
        fc.retrieve(forceService);
    }));

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((textDocument: vscode.TextDocument) => {
        const toolingType: string = parsers.getToolingType(textDocument);
        const config: any = vscode.workspace.getConfiguration('sfdc');
        if (forceService.conn && toolingType !== undefined && config.autoCompile === true) {
            fc.compile(forceService, textDocument);
        }
    }));
}
