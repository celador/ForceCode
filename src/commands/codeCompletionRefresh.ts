import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';
import * as error from './../util/error';
import * as dx from './dx';
import * as ccr from '../dx/generator';

export default function codeCompletionRefresh(context: vscode.ExtensionContext): Promise<any> {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Refreshing Objects from Org';
    return vscode.window.forceCode.connect(context)
        .then(svc => getToqlQuery(svc))
        .then(finished, onError);

    function getToqlQuery(svc) {
        var gen = ccr.FauxClassGenerator
        let options: vscode.InputBoxOptions = {
            placeHolder: 'Enter Tooling Object query',
            prompt: `Enter a TOQL query to get the results in a json file in the toql folder`,
        };
        return vscode.window.showInputBox(options).then(query => {
            return vscode.window.forceCode.conn.tooling.query(query).then(res => {
                let filePath: string = vscode.workspace.rootPath + path.sep + 'toql' + path.sep + Date.now() + '.json';
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
