import vscode = require('vscode');
import { QueryResult } from '../services/dxService';
// import ReferencesDocument from './referencesDocument';
/**
 * Salesforce Content Provider class.
 * This class provides an easy way to retrieve files as a native VSCode.Uri
 */
export default class ForceCodeContentProvider implements vscode.TextDocumentContentProvider {
    public auraSource: string;
    private static instance: ForceCodeContentProvider;

    public static getInstance() {
        if(!ForceCodeContentProvider.instance) {
            this.instance = new ForceCodeContentProvider();
        }
        return this.instance;
    }

    /**
     * @param {vscode.Uri} uri file
     * @param {vscode.CancellationToken} token
     * @return {Thenable<string>} TODO: give a description
     */
    provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
        if(this.auraSource) {
            return Promise.resolve(this.auraSource).then(res => { 
                this.auraSource = undefined;
                return res;
            });
        }
        var uriParts: string[] = uri.path.split('/');
        let toolingType: string = uriParts[1];
        var name: string = uriParts[2];
        var toolingName: string = name.split('.')[0];
        var field: string = 'Body';
        if (toolingType === 'ApexComponent' || toolingType === 'ApexPage') {
            field = 'Markup';
        }
        return new Promise<string>((resolve, reject) => {
            var query: string = `SELECT ${field} FROM ${toolingType} WHERE NamespacePrefix = '${vscode.window.forceCode.config.prefix ? vscode.window.forceCode.config.prefix : ''}' and Name='${toolingName}'`;
            vscode.window.forceCode.conn.tooling.query(query).then((results: QueryResult) => {
                if (results && results.totalSize === 1) {
                    resolve(results.records[0][field]);
                } else {
                    reject('Object not found');
                }
            }, err => vscode.window.showErrorMessage(err.message));
        });
    }

}
