import * as vscode from 'vscode';
import * as parsers from './../parsers';
import { saveService } from '../services';
import * as path from 'path';
import { createPackageXML, deployFiles } from './deploy';

// =======================================================================================================================================
// ================================                Lightning Web Components               ================================================
// =======================================================================================================================================
export function saveLWC(
  document: vscode.TextDocument,
  toolingType: string,
  forceCompile?: boolean
): Promise<any> {
  const name: string | undefined = parsers.getName(document, toolingType);

  return Promise.resolve(vscode.window.forceCode)
    .then(getLWCBundle)
    .then(ensureLWCBundle)
    .then(bundle => {
      if (Array.isArray(bundle)) {
        return getLWCDefinition(bundle).then((definitions: any) =>
          upsertLWCDefinition(definitions, bundle)
        );
      } else {
        return Promise.resolve(bundle);
      }
    });

  function getLWCBundle() {
    return vscode.window.forceCode.conn.tooling.sobject('LightningComponentBundle').find({
      DeveloperName: name,
      NamespacePrefix: vscode.window.forceCode.config.prefix || '',
    });
  }
  function ensureLWCBundle(results: any) {
    // If the Bundle doesn't exist, create it, else Do nothing
    if (name && (results.length === 0 || !results[0])) {
      // Create LWC Bundle
      return saveLWCPackage();
    } else {
      return results;
    }
  }

  function getLWCDefinition(bundle: any) {
    return vscode.window.forceCode.conn.tooling.sobject('LightningComponentResource').find({
      LightningComponentBundleId: bundle[0].Id,
    });
  }
  function upsertLWCDefinition(definitions: any, bundle: any) {
    const filePath: string | undefined = document.fileName.split(path.sep).shift();
    if (!filePath) {
      return undefined;
    }
    // add files in the folder to PreSaveFiles so we can compare content
    saveService.addFilesInFolder(filePath);
    var changedFiles: any[] = definitions.filter(
      def =>
        !saveService.compareContents(path.join(filePath, def.FilePath.split('/').pop()), def.Source)
    );

    if (changedFiles.length !== 0) {
      var changedFileNames: string = changedFiles
        .map(file => file.FilePath.split('/').pop())
        .join(',');
      return vscode.window
        .showWarningMessage(
          `Someone has changed ${changedFileNames} in this bundle! Overwrite?`,
          'Yes',
          'No'
        )
        .then(s => {
          if (s === 'Yes') {
            return saveLWCPackage();
          }
          return {};
        });
    } else {
      return saveLWCPackage();
    }
  }

  function saveLWCPackage() {
    if (!name) {
      return undefined;
    }
    return createPackageXML([document.fileName], vscode.window.forceCode.storageRoot).then(() => {
      const files: string[] = [];
      files.push(path.join('lwc', name));
      files.push('package.xml');
      return deployFiles(files, vscode.window.forceCode.storageRoot);
    });
  }
}
