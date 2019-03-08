import * as vscode from 'vscode';
import * as parsers from './../parsers';
import { saveService } from '../services';
import diff from './diff';
import * as path from 'path';
import { createPackageXML, deployFiles } from './deploy';

// =======================================================================================================================================
// ================================                Lightning Components               ===========================================
// =======================================================================================================================================
export function saveLWC(
  document: vscode.TextDocument,
  toolingType: string,
  forceCompile?: boolean
): Promise<any> {
  const fileName: string = document.fileName.split(path.sep).pop();
  const name: string = parsers.getName(document, toolingType);
  const Format: string = parsers.getFileExtension(document);
  var Source: string = document.getText();
  var currentObjectDefinition: any = undefined;

  return Promise.resolve(vscode.window.forceCode)
    .then(getLWCBundle)
    .then(ensureLWCBundle)
    .then(bundle => {
      return getLWCDefinition(bundle).then(definitions => upsertLWCDefinition(definitions, bundle));
    });

  function getLWCBundle() {
    return vscode.window.forceCode.conn.tooling.sobject('LightningComponentBundle').find({
      DeveloperName: name,
      NamespacePrefix: vscode.window.forceCode.config.prefix || '',
    });
  }
  function ensureLWCBundle(results) {
    // If the Bundle doesn't exist, create it, else Do nothing
    if (results.length === 0 || !results[0]) {
      // Create LWC Bundle
      return createPackageXML([document.fileName], vscode.window.forceCode.storageRoot).then(() => {
        const files: string[] = [];
        files.push(path.join('lwc', name));
        files.push('package.xml');
        return deployFiles(files, vscode.window.forceCode.storageRoot)
          .then(getLWCBundle)
          .then(bundle => {
            results[0] = bundle;
            return results;
          });
      });
    } else {
      return results;
    }
  }

  function getLWCDefinition(bundle) {
    return vscode.window.forceCode.conn.tooling.sobject('LightningComponentResource').find({
      LightningComponentBundleId: bundle[0].Id,
    });
  }
  function upsertLWCDefinition(definitions, bundle) {
    // If the Definition doesn't exist, create it
    var def: any[] = definitions.filter(result => result.FilePath.split('/').pop() === fileName);
    currentObjectDefinition = def.length > 0 ? def[0] : undefined;
    if (currentObjectDefinition !== undefined) {
      const serverContents: string = currentObjectDefinition.Source;
      if (!forceCompile && !saveService.compareContents(document, serverContents)) {
        return vscode.window
          .showWarningMessage('Someone has changed this file!', 'Diff', 'Overwrite')
          .then(s => {
            if (s === 'Diff') {
              diff(document, true);
              return {};
            }
            if (s === 'Overwrite') {
              return updateLWC();
            }
            return {};
          });
      } else {
        return updateLWC();
      }
    } else if (bundle[0]) {
      return vscode.window.forceCode.conn.tooling
        .sobject('LightningComponentResource')
        .create({
          LightningComponentBundleId: bundle[0].Id ? bundle[0].Id : bundle[0].id,
          Format,
          Source,
          FilePath: document.fileName
            .split(vscode.window.forceCode.projectRoot + path.sep)
            .pop()
            .split('\\')
            .join('/'),
        })
        .catch(err => {
          return {
            State: 'Error',
            message:
              'Error: File not created on server either because the name of the file is incorrect or there are syntax errors.',
          };
        });
    }
    return undefined;
  }

  function updateLWC() {
    return vscode.window.forceCode.conn.tooling
      .sobject('LightningComponentResource')
      .update({ Id: currentObjectDefinition.Id, Source })
      .catch(err => {
        return { State: 'Error', message: err.message ? err.message : err };
      });
  }
}
