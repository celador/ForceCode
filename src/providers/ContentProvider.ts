import * as vscode from 'vscode';
import * as path from 'path';
import { getAuraNameFromFileName } from '../parsers';
import { getAuraDefTypeFromDocument } from '../commands';
import { QueryResult } from 'jsforce';

/**
 * Salesforce Content Provider class.
 * This class provides an easy way to retrieve files as a native VSCode.Uri
 */
export class ForceCodeContentProvider implements vscode.TextDocumentContentProvider {
  public auraSource: vscode.TextDocument | undefined;
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
    let uriParts: string[] = uri.path.split('/');
    let toolingType: string = uriParts[1];
    let name: string | undefined = uriParts[2];
    let toolingName: string = name.split('.')[0];
    let field: string = 'Body';
    let nsPrefix = `NamespacePrefix = '${vscode.window.forceCode.config.prefix ||
      ''}' and Name='${toolingName}'`;
    if (toolingType === 'ApexComponent' || toolingType === 'ApexPage') {
      field = 'Markup';
    } else if (this.auraSource && toolingType === 'AuraDefinition') {
      field = 'Source';
      name = getAuraNameFromFileName(this.auraSource.fileName, 'aura');
      const DefType: string | undefined = getAuraDefTypeFromDocument(this.auraSource);
      nsPrefix = `DefType='${DefType}' AND AuraDefinitionBundleId IN (SELECT Id FROM AuraDefinitionBundle WHERE DeveloperName='${name}')`;
    } else if (this.auraSource && toolingType === 'LightningComponentResource') {
      field = 'Source';
      name = getAuraNameFromFileName(this.auraSource.fileName, 'lwc');
      let FilePath: string | undefined = this.auraSource.fileName
        .split(vscode.window.forceCode.projectRoot + path.sep)
        .pop();
      FilePath = FilePath?.split(path.sep).join('/') || '';
      nsPrefix = `FilePath='${FilePath}' AND LightningComponentBundleId IN (SELECT Id FROM LightningComponentBundle WHERE DeveloperName='${name}')`;
    }
    return new Promise<string>((resolve, reject) => {
      let query: string = `SELECT ${field} FROM ${toolingType} WHERE ${nsPrefix}`;
      vscode.commands.executeCommand('ForceCode.toolingQuery', query).then(
        results => {
          const theResults = results as QueryResult;
          if (theResults?.totalSize === 1) {
            return resolve(theResults.records[0][field]);
          } else {
            return resolve('The current file could NOT be found in the org');
          }
        },
        (err: Error) => reject(err)
      );
    });
  }
}
