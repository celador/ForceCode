import * as vscode from 'vscode';
import * as path from 'path';
import { QueryResult } from '../services/dxService';
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
    if (!ForceCodeContentProvider.instance) {
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
    var nsPrefix = `NamespacePrefix = '${
      vscode.window.forceCode.config.prefix ? vscode.window.forceCode.config.prefix : ''
    }' and Name='${toolingName}'`;
    if (toolingType === 'ApexComponent' || toolingType === 'ApexPage') {
      field = 'Markup';
    } else if (toolingType === 'AuraDefinition') {
      field = 'Source';
      name = getAuraNameFromFileName(this.auraSource.fileName, 'aura');
      const DefType: string = getAuraDefTypeFromDocument(this.auraSource);
      nsPrefix = `DefType='${DefType}' AND AuraDefinitionBundleId IN (SELECT Id FROM AuraDefinitionBundle WHERE DeveloperName='${name}')`;
    } else if (toolingType === 'LightningComponentResource') {
      field = 'Source';
      name = getAuraNameFromFileName(this.auraSource.fileName, 'lwc');
      const FilePath: string = this.auraSource.fileName
        .split(vscode.window.forceCode.projectRoot + path.sep)
        .pop()
        .split(path.sep)
        .join('/');
      nsPrefix = `FilePath='${FilePath}' AND LightningComponentBundleId IN (SELECT Id FROM LightningComponentBundle WHERE DeveloperName='${name}')`;
    }
    return new Promise<string>((resolve, reject) => {
      var query: string = `SELECT ${field} FROM ${toolingType} WHERE ${nsPrefix}`;
      vscode.window.forceCode.conn.tooling.query(query).then(
        (results: QueryResult) => {
          if (results && results.totalSize === 1) {
            resolve(results.records[0][field]);
          } else {
            reject('Object not found');
          }
        },
        err => vscode.window.showErrorMessage(err.message)
      );
    });
  }
}
