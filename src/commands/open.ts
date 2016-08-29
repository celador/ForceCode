import * as vscode from 'vscode';
import fs = require('fs-extra');
import jsforce = require('jsforce');
import * as error from './../util/error';

import {getIcon, getExtension, getFolder} from './../parsers';
const TYPEATTRIBUTE: string = 'type';

export default function open(context: vscode.ExtensionContext) {
  'use strict';
  let bundleName: string = '';
  vscode.window.setStatusBarMessage('open Started');

  return vscode.window.forceCode.connect(context)
    .then(svc => showFileOptions())
    .then(opt => getFile(opt))
    .then(res => writeFiles(res))
    .then(finished)
    .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));
  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================
  function showFileOptions() {
    var promises: any[] = [
      // Apex Stuff
      vscode.window.forceCode.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexClass'),
      vscode.window.forceCode.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexTrigger'),
      // VisualForce stuff
      vscode.window.forceCode.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexPage'),
      vscode.window.forceCode.conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexComponent'),
      vscode.window.forceCode.conn.tooling.query('SELECT Id, Name, NamespacePrefix, ContentType FROM StaticResource'),
      // Lightning stuff
      vscode.window.forceCode.conn.tooling.query('SELECT Id, DeveloperName, NamespacePrefix, ApiVersion, Description FROM AuraDefinitionBundle'),
      // vscode.window.forceCode.conn.tooling.query('SELECT Id, AuraDefinitionBundleId, AuraDefinitionBundle.DeveloperName, DefType, Format FROM AuraDefinition'),
    ];
    // TODO: Objects
    // TODO: Static Resources
    // TODO: Packages
    return Promise.all(promises).then(results => {
      let options: vscode.QuickPickItem[] = results
        .map(res => res.records)
        .reduce((prev, curr) => {
          return prev.concat(curr);
        })
        .map(record => {
          let icon: string = getIcon(record.attributes[TYPEATTRIBUTE]);
          return {
            description: `${record.Id}`,
            detail: `${record.attributes[TYPEATTRIBUTE]}`,
            label: `$(${icon}) ${record.Name || record.DeveloperName}`,
          };
        });
      let config: {} = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Retrieve a Salesforce File',
      };
      return vscode.window.showQuickPick(options, config);
    });
  }

  // =======================================================================================================================================
  function getFile(res: any) {
    if (res.detail === 'AuraDefinitionBundle') {
      return vscode.window.forceCode.conn.tooling.query(`SELECT Id, AuraDefinitionBundleId, AuraDefinitionBundle.DeveloperName, DefType, Format FROM AuraDefinition where AuraDefinitionBundleId = '${res.description}'`).then(function (auraDefinitionResults) {
        if (auraDefinitionResults.records && auraDefinitionResults.records.length > 0) {
          bundleName = auraDefinitionResults.records[0].AuraDefinitionBundle.DeveloperName;
        } else {
          throw 'No bundle files';
        }
        return Promise.all(auraDefinitionResults.records.map(function (auraDefinition) {
          return vscode.window.forceCode.conn.tooling.sobject('AuraDefinition').find({ Id: auraDefinition.Id }).execute();
        })).then(function (results) {
          return results.map(function (qr) {
            return qr.length > 0 ? qr[0] : undefined;
          });
        });
      });
    } else if (res !== undefined) {
      return vscode.window.forceCode.conn.tooling.sobject(res.detail)
        .find({ Id: res.description }).execute();
    } else {
      throw 'No file selected to open';
    }
  }


  // Right here we need to do something for Lightning components... see, what happens is that we Go search for bundles, which the bundles are the lightning components... 
  // The AuraDefinitions are part of the Lightning components.. so... we first get the definition of what the componenet has..
  // Then we can use the Id of the selected AuraDefinitionBundle to retrieve the actual AuraDefinition files that belong to it...
  // We query the different objects, then store them all in a folder, in the Aura folder... 



  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================
  function writeFiles(results): Promise<any> {
    return Promise.all(results.map(function (res) {
      var filename: string = '';
      let toolingType: string = res.attributes[TYPEATTRIBUTE];
      if (toolingType === 'AuraDefinition') {
        if (res.DefType && res.DefType.length > 0) {
          var defType: string = res.DefType.toLowerCase().split('').map((c, i) => i === 0 ? c.toUpperCase() : c).join('');
        }
        let extension: string = getExtension(defType);
        // let filename: string = `${vscode.workspace.rootPath}/src/aura/${bundleName}/${bundleName}${defType}.${extension}`;
        let actualFileName = extension === 'js' ? bundleName + defType : bundleName;
        filename = vscode.workspace.rootPath + '/src/aura/' + bundleName + '/' + actualFileName + '.' + extension;
        let body: string = res.Source;
        return new Promise((resolve, reject) => {
          fs.outputFile(filename, body, function (err) {
            if (err) { reject(err); }
            if (results.length === 1) {
              vscode.workspace.openTextDocument(filename).then(doc => vscode.window.showTextDocument(doc, 3));
            }
            resolve(true);
          });
        });
      } else {
        filename = `${vscode.workspace.rootPath}/src/${getFolder(toolingType)}/${res.FullName || res.Name}.${getExtension(toolingType)}`;
        let body: string = res.Body || res.Markup;
        return new Promise((resolve, reject) => {
          fs.outputFile(filename, body, function (err) {
            if (err) { reject(err); }
            if (results.length === 1) {
              vscode.workspace.openTextDocument(filename).then(doc => vscode.window.showTextDocument(doc, 3));
            }
          });
          resolve(true);
        });
      }
    }));
  }
  // =======================================================================================================================================
  function finished(rsp): boolean {
    vscode.window.setStatusBarMessage('ForceCode: Retrieve Lightning Finished');
    return true;
  }
//   function onError(err): boolean {
//     vscode.window.setStatusBarMessage('ForceCode: Error Opening File');
//     var outputChannel: vscode.OutputChannel = vscode.window.forceCode.outputChannel;
//     outputChannel.appendLine('================================================================');
//     outputChannel.appendLine(err);
//     console.error(err);
//     return false;
//   }
  // =======================================================================================================================================
}
