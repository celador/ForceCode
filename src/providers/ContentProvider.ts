import * as vscode from 'vscode';
import { QueryResult } from '../services/dxService';
import { codeCovViewService } from '../services';
import { getAuraNameFromFileName } from '../parsers';
import { getAuraDefTypeFromDocument } from '../commands/saveAura';
// import ReferencesDocument from './referencesDocument';
/**
 * Salesforce Content Provider class.
 * This class provides an easy way to retrieve files as a native VSCode.Uri
 */
export default class ForceCodeContentProvider implements vscode.TextDocumentContentProvider {
    public auraSource: vscode.TextDocument;
    private static instance: ForceCodeContentProvider;

    public static getInstance() {
        if(!ForceCodeContentProvider.instance) {
            this.instance = new ForceCodeContentProvider();
        }
        return this.instance;
    }

    /**
     * @param {vscode.Uri} uri file
     * @return {Thenable<string>} TODO: give a description
     */
    provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
        var uriParts: string[] = uri.path.split('/');
        let toolingType: string = uriParts[1];
        var name: string = uriParts[2];
        var toolingName: string = name.split('.')[0];
        var field: string = 'Body';
        var nsPrefix = `NamespacePrefix = '${vscode.window.forceCode.config.prefix ? vscode.window.forceCode.config.prefix : ''}' and Name='${toolingName}'`;
        if (toolingType === 'ApexComponent' || toolingType === 'ApexPage') {
            field = 'Markup';
        } else if (toolingType === 'AuraDefinition') {
            field = 'Source';
            name = getAuraNameFromFileName(this.auraSource.fileName);
            const DefType: string = getAuraDefTypeFromDocument(this.auraSource);
            nsPrefix = `DefType='${DefType}' AND AuraDefinitionBundleId='${codeCovViewService.findByNameAndType(name, 'AuraDefinitionBundle').getWsMember().id}'`;
        }
        return new Promise<string>((resolve, reject) => {
            var query: string = `SELECT ${field} FROM ${toolingType} WHERE ${nsPrefix}`;
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
