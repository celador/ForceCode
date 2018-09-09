import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';
import { dxService } from '../services';

export default function soql(): any {
    let options: vscode.InputBoxOptions = {
        placeHolder: 'Enter SOQL query',
        prompt: `Enter a SOQL query to get the results in a json file in the soql folder`,
    };
    return vscode.window.showInputBox(options).then(query => {
        if(!query) {
            return undefined;
        }
        return vscode.window.forceCode.conn.query(query).then(res => {
            let filePath: string = vscode.window.forceCode.projectRoot + path.sep + 'soql' + path.sep + Date.now() + '.json';
            var data: string = dxService.outputToString(res.records);
            return fs.outputFile(filePath, data, function() {
                return vscode.workspace.openTextDocument(filePath).then(doc => { 
                    vscode.window.showTextDocument(doc);
                    vscode.window.forceCode.showStatus("ForceCode: Successfully executed query!");
                });
            });
        });
    });
}
