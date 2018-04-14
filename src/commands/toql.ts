import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';
import * as error from './../util/error';
import * as dx from '../services/runDXCmd';

export default function toql(context: vscode.ExtensionContext): Promise<any> {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Run TOQL Query';
    return vscode.window.forceCode.connect(context)
        .then(svc => getToqlQuery(svc))
        .then(finished, onError);

    function getToqlQuery(svc) {
        let options: vscode.InputBoxOptions = {
            placeHolder: 'Enter Tooling Object query',
            prompt: `Enter a TOQL query to get the results in a json file in the toql folder`,
        };
        return vscode.window.showInputBox(options).then(query => {
            return vscode.window.forceCode.conn.tooling.query(query).then(res => {
                let filePath: string = vscode.workspace.rootPath + path.sep + 'toql' + path.sep + Date.now() + '.json';
                fs.outputFile(vscode.workspace.rootPath + path.sep + 'toql' + path.sep + Date.now() + '.json', dx.outputToString(res.records));
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
