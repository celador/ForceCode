import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { outputToString, outputToCSV } from '../parsers/output';

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
            const csv: boolean = vscode.window.forceCode.config.outputQueriesAsCSV;
            let filePath: string = vscode.window.forceCode.projectRoot + path.sep + 'soql' + path.sep + Date.now() + (csv ? '.csv' : '.json');
            var data: string = csv ? outputToCSV(res.records) : outputToString(res.records);
            return fs.outputFile(filePath, data, function() {
                return vscode.workspace.openTextDocument(filePath).then(doc => { 
                    vscode.window.showTextDocument(doc);
                    vscode.window.forceCode.showStatus("ForceCode: Successfully executed query!");
                });
            });
        });
    });
}
