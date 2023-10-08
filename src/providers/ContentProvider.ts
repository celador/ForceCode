import * as vscode from 'vscode';
import * as path from 'path';
import { getAuraNameFromFileName } from '../parsers';
import { getAuraDefTypeFromDocument } from '../commands';
import { QueryResult } from 'jsforce';
import { getSrcDir } from '../services/configuration';
import * as xml2js from 'xml2js';

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
    const uriParts: string[] = uri.path.split('/');
    let toolingType: string = uriParts[1];
    let name: string | undefined = uriParts[2];
    const nameParts: string[] = name.split('.');
    const toolingName: string = nameParts[0];
    const ext = nameParts[nameParts.length - 1];
    console.log('uriParts diff: ', uriParts);
    let field: string = ext == 'xml' ? 'Metadata' : 'Body';

    let nsPrefix = `NamespacePrefix = '${
      vscode.window.forceCode.config.prefix || ''
    }' and Name='${toolingName}'`;

    if (toolingType === 'ApexComponent' || toolingType === 'ApexPage') {
      if (ext == 'xml') {
        // TODO haven't been able to figure this one out quite yet...
        if (toolingType === 'ApexComponent') {
          field = 'NOT_SUPPORTED';
        }
      } else {
        field = 'Markup';
      }
    } else if (this.auraSource && toolingType === 'AuraDefinition') {
      if (ext == 'xml') {
        toolingType = 'AuraDefinitionBundle';
        nsPrefix = `NamespacePrefix = '${
          vscode.window.forceCode.config.prefix || ''
        }' and DeveloperName='${toolingName}'`;
      } else {
        field = 'Source';
        name = getAuraNameFromFileName(this.auraSource.fileName, 'aura');
        const DefType: string | undefined = getAuraDefTypeFromDocument(this.auraSource);
        nsPrefix = `DefType='${DefType}' AND AuraDefinitionBundleId IN (SELECT Id FROM AuraDefinitionBundle WHERE DeveloperName='${name}')`;
      }
    } else if (this.auraSource && toolingType === 'LightningComponentResource') {
      field = 'Source';
      name = getAuraNameFromFileName(this.auraSource.fileName, 'lwc');
      let FilePath: string | undefined = this.auraSource.fileName
        .split(getSrcDir() + path.sep)
        .pop();
      FilePath = FilePath?.split(path.sep).join('/') || '';
      nsPrefix = `FilePath='${FilePath}' AND LightningComponentBundleId IN (SELECT Id FROM LightningComponentBundle WHERE DeveloperName='${name}')`;
    }

    return new Promise<string>((resolve, reject) => {
      const query: string = `SELECT ${field} FROM ${toolingType} WHERE ${nsPrefix}`;
      console.log('query: ', query);
      if (field == 'NOT_SUPPORTED') {
        return reject('Metadata type not supported for diffing at this time');
      }
      vscode.commands.executeCommand('ForceCode.toolingQuery', query).then(
        (results) => {
          console.log('query results: ', results);
          const theResults = results as QueryResult;
          if (theResults?.totalSize === 1) {
            if (field == 'Metadata') {
              const builder = new xml2js.Builder();
              const mdObj: any = {};
              mdObj[toolingType] = theResults.records[0][field];
              delete mdObj[toolingType].auraDefinitions;
              delete mdObj[toolingType].markup;
              delete mdObj[toolingType].type;
              Object.keys(mdObj[toolingType]).forEach((key) => {
                if (mdObj[toolingType][key] == undefined || mdObj[toolingType][key] == null) {
                  delete mdObj[toolingType][key];
                }
              });
              console.log('built obj: ', mdObj);
              let xml: string =
                builder
                  .buildObject(mdObj)
                  .replace(
                    toolingType,
                    `${toolingType} xmlns="http://soap.sforce.com/2006/04/metadata"`
                  )
                  .replace(' standalone="yes"', '')
                  .replace('</apiVersion>', '.0</apiVersion>')
                  .split('  ') // yeah I don't like this either...
                  .join('    ') + '\n';
              console.log('xml out: ', xml);
              resolve(xml);
            } else {
              resolve(theResults.records[0][field]);
            }
          } else {
            resolve('The current file could NOT be found in the org');
          }
        },
        (err: Error) => reject(err)
      );
    });
  }
}
