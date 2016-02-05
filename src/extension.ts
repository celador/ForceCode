// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as jsforce from 'jsforce';
import * as SOAP from 'jsforce/lib/soap';

var config = {};

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
        var apexBody: string = vscode.window.activeTextEditor.document.getText();
        // vscode.window.showInformationMessage(text);
        var output: vscode.OutputChannel = vscode.window.createOutputChannel('ForceCode');


        var conn = new jsforce.Connection();
        conn.login('john.aaron.nelson@gmail.com', 'Science3', function(err, res) {
            if (err) { return console.error(err); }
            // conn.query('SELECT Id, Name FROM Account', function(err, res) {
            //     if (err) { return console.error(err); }
            //     // console.log(res);
            //     output.show(3);
            //     // res.records.forEach(element => {
            //     //     output.appendLine(element.Name);
            //     // });
            // });
            conn.identity(function(err, res) {
                if (err) { return console.error(err); }
                config.userId = res.user_id;
                console.log("user ID: " + res.user_id);

                conn.tooling.sobject('traceFlag').create({
                    'ApexCode': 'Debug',
                    'ApexProfiling': 'Error',
                    'Callout': 'Error',
                    'Database': 'Error',
                    'ExpirationDate': '2016-02-06',
                    'TracedEntityId': res.user_id,
                    'Validation': 'Error',
                    'Visualforce': 'Error',
                    'Workflow': 'Error',
                    'ScopeId': null,
                    'System': 'Error',
                }, execute);
                function execute(err, res) {
                    if (err) {
                        return console.error(err);
                    }
                    console.log(res);

                    conn.tooling.executeAnonymous(apexBody, function(err, res) {
                        var message: string = '';
                        if (!res.compiled) {
                            message = 'Compile Problem: ' + res.compileProblem;
                            vscode.window.showErrorMessage(message);
                            return console.error(message);
                        }
                        if (!res.success) {
                            message = 'Exception: ' + res.exceptionMessage;
                            vscode.window.showErrorMessage(message);
                            return console.error();
                        }
                        vscode.window.showInformationMessage('Success!');
                        config.queryString = `SELECT Id FROM ApexLog WHERE Request = 'API' AND Location = 'Monitoring' AND Operation like '%executeAnonymous%' AND LogUserId='${ config.userId }' ORDER BY StartTime DESC, Id DESC LIMIT 1`;


                        conn.query(config.queryString, queryCallback);
                        // console.log("compiled?: " + res.compiled); // compiled successfully
                        // console.log("executed?: " + res.success); // executed successfully
                        // var soapEndpoint = new SOAP(conn, {
                        //     xmlns: "urn:partner.soap.sforce.com",
                        //     endpointUrl: conn.instanceUrl + "/services/Soap/u/" + conn.version
                        // });
                        // return soapEndpoint.invoke('executeanonymous', apexBody).then(function(res) {
                        //     return res.result;
                        // }).thenCall(console.log);
                    });

                }
            });

        });
    });

    context.subscriptions.push(disposable);
}

function queryCallback(err, res) {
    'use strict';
    if (err) { return console.error(err); }
    console.log('total : ' + res.totalSize);
    console.log('fetched : ' + res.records.length);
}
