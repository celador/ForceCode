import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import {IForceService} from './forceCode';
import {ForceService, constants} from './services';
import * as commands from './commands';
import * as parsers from './parsers';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): any {
    'use strict';
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('ForceCode is now active!');
    context.workspaceState.update(constants.FORCE_SERVICE, new ForceService());
    context.workspaceState.update(constants.OUTPUT_CHANNEL, vscode.window.createOutputChannel('ForceCode'));
    // this.conn = new jsforce.Connection();
    /// TODO: Pull credentials from .config jsforce.config.js file from the user directory

    // // // Peek Provider Setup
    // // const peekProvider: any = new commands.PeekFileDefinitionProvider();
    // // const definitionProvider: any = vscode.languages.registerDefinitionProvider(constants.PEEK_FILTER, peekProvider);
    // // context.subscriptions.push(definitionProvider);

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.showMenu', () => {
        commands.showMenu(context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.executeAnonymous', () => {
        commands.executeAnonymous(vscode.window.activeTextEditor.document, context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.getLog', () => {
        commands.getLog(context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.compile', () => {
        commands.compile(vscode.window.activeTextEditor.document, context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.open', () => {
        commands.open(context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.exportPackage', () => {
        commands.retrieve();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ForceCode.staticResource', () => {
        commands.staticResource(context);
    }));

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((textDocument: vscode.TextDocument) => {
        const toolingType: string = parsers.getToolingType(textDocument);
        var service: IForceService = <IForceService>context.workspaceState.get(constants.FORCE_SERVICE);
        const config: any = service && service.config;
        if (toolingType && config && config.autoCompile === true) {
            commands.compile(textDocument, context);
        }
    }));
}
