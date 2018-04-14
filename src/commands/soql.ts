import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';
import * as error from './../util/error';
import * as dx from '../services/runDXCmd';

export default function soql(context: vscode.ExtensionContext): Promise<any> {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Run SOQL Query';
    return vscode.window.forceCode.connect(context)
        .then(svc => getSoqlQuery(svc))
        .then(finished, onError);

    function getSoqlQuery(svc) {
        let options: vscode.InputBoxOptions = {
            placeHolder: 'Enter SOQL query',
            prompt: `Enter a SOQL query to get the results in a json file in the soql folder`,
        };
        return vscode.window.showInputBox(options).then(query => {
            return vscode.window.forceCode.conn.query(query).then(res => {
                let filePath: string = vscode.workspace.rootPath + path.sep + 'soql' + path.sep + Date.now() + '.json';
                fs.outputFile(vscode.workspace.rootPath + path.sep + 'soql' + path.sep + Date.now() + '.json', dx.outputToString(res.records));
                return vscode.workspace.openTextDocument(filePath).then(doc => {
                    vscode.window.showTextDocument(doc);
                });
            });
        });
    }
    function finished() {
        // Take the results
        // And write them to a file
        vscode.window.forceCode.resetMenu();
    }
    function onError(err) {
        // Take the results
        // And write them to a file
        vscode.window.forceCode.resetMenu();
        error.outputError({ message: err }, vscode.window.forceCode.outputChannel);
    }
    // =======================================================================================================================================
}
