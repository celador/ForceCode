// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as jsforce from 'jsforce';
// import * as SOAP from 'jsforce/lib/soap';
import * as moment from 'moment';

var config: {
    userId: string;
    queryString: string;
    conn: {};
    apexBody: string;
    output: vscode.OutputChannel
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    'use strict';
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('ForceCode is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    var disposable = vscode.commands.registerCommand('extension.sayHello', () => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        // vscode.window.showInformationMessage('Hello World!');

        // Get the active window text
        config.apexBody = vscode.window.activeTextEditor.document.getText();

        // Create the output channel that we will pipe our results to.
        config.output = vscode.window.createOutputChannel('ForceCode');

        // Establish our connection object
        config.conn = new jsforce.Connection();

        // Login, then get Identity info, then enable logging, then execute the query, then get the debug log, then disable logging
        config.conn.login('john.aaron.nelson@gmail.com', 'Science3')
            .then(console.log);
    });

    context.subscriptions.push(disposable);
}


