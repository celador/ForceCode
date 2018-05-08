import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';

export default function soql(): any {
    let options: vscode.InputBoxOptions = {
        placeHolder: 'Enter SOQL query',
        prompt: `Enter a SOQL query to get the results in a json file in the soql folder`,
    };
    return vscode.window.showInputBox(options).then(query => {
        if(!query) {
            return;
        }
        return vscode.window.forceCode.conn.query(query).then(res => {
            let filePath: string = vscode.workspace.rootPath + path.sep + 'soql' + path.sep + Date.now() + '.json';
            var data: string = vscode.window.forceCode.dxCommands.outputToString(res.records);
            return fs.outputFile(filePath, data, function() {
                return vscode.workspace.openTextDocument(filePath).then(doc => { 
                    vscode.window.showTextDocument(doc);
                    vscode.window.forceCode.showStatus("ForceCode: Successfully executed query!");
                });
            });
        })
        .catch(onError);
    });

    function onError(err) {
        err = "ForceCode: Error running query\n" + err;
        vscode.window.showErrorMessage(err);
    }
    // =======================================================================================================================================
}
