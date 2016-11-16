import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as error from './../util/error';

export default function soql(context: vscode.ExtensionContext): Promise<any> {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Run SOQL Query';
    const slash: string = vscode.window.forceCode.pathSeparator;

    return vscode.window.forceCode.connect(context)
        .then(svc => getSoqlQuery(svc))
        .then(finished, onError);

    function getSoqlQuery(svc) {
        let options: vscode.InputBoxOptions = {
            placeHolder: 'Entery SOQL query',
            prompt: `Enter a SOQL query to get the results in a json file in the soql folder`,
        };
        return vscode.window.showInputBox(options).then(query => {
            return vscode.window.forceCode.conn.query(query).then(res => {
                let filePath: string = vscode.workspace.rootPath + slash + 'soql' + slash + Date.now() + '.json';
                return fs.outputJson(filePath, res.records, (f) => {
                    return vscode.workspace.openTextDocument(filePath).then(document => {
                        return vscode.window.showTextDocument(document, vscode.ViewColumn.Three);
                    });
                });
            });
        });
    }
    function finished() {
        // Take the results
        // And write them to a file
    }
    function onError(err) {
        // Take the results
        // And write them to a file
        error.outputError({ message: err }, vscode.window.forceCode.outputChannel);
    }
    // =======================================================================================================================================
}
