import * as vscode from 'vscode';
import * as error from './../util/error';

export default function soql(context: vscode.ExtensionContext): Promise<any> {
    vscode.window.setStatusBarMessage('ForceCode: Run SOQL Query');

    return vscode.window.forceCode.connect(context)
        .then(svc => getSoqlQuery(svc))
        .then(finished, onError);

    function getSoqlQuery(svc) {
        let options: vscode.InputBoxOptions = {
            placeHolder: 'Entery SOQL query',
            prompt: `Enter a SOQL query to get the results in a json file in the soql folder`,
        };
        return vscode.window.showInputBox(options).then(query => {
            return vscode.window.forceCode.conn.query(query);
        });
    }
    function finished(){
        
    }
    function onError(){
        
    }
    // =======================================================================================================================================
}
