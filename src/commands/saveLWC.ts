import * as vscode from 'vscode';
import { saveService, notifications } from '../services';
import * as path from 'path';
import { createPackageXML, deployFiles, FCCancellationToken } from '.';

// =======================================================================================================================================
// ================================                Lightning Web Components               ================================================
// =======================================================================================================================================
// TODO: Add cancellation token to updates. Updates with LCs are quick, so is this possible??
export function saveLWC(
  document: vscode.TextDocument,
  name: string | undefined,
  cancellationToken: FCCancellationToken,
  forceCompile?: boolean
): Promise<any> {
  return Promise.resolve(vscode.window.forceCode)
    .then(getLWCBundle)
    .then(ensureLWCBundle)
    .then(bundle => {
      if (Array.isArray(bundle)) {
        return getLWCDefinition(bundle).then(upsertLWCDefinition);
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
  function upsertLWCDefinition(definitions: any) {
    const docPath = document.fileName;
    const filePath: string = docPath.substring(0, docPath.lastIndexOf(path.sep));

    // add files in the folder to PreSaveFiles so we can compare content
    saveService.addFilesInFolder(filePath);
    let changedFiles: any[] = definitions.filter(
      (def: any) =>
        !saveService.compareContents(path.join(filePath, def.FilePath.split('/').pop()), def.Source)
    );
    saveService.removeFilesInFolder(filePath);

    if (!forceCompile && changedFiles.length === 1) {
      return notifications
        .showWarning('Someone has changed this file!', 'Diff', 'Overwrite')
        .then(s => {
          if (s === 'Diff') {
            vscode.commands.executeCommand('ForceCode.diff', document.uri);
            return {};
          }
          if (s === 'Overwrite') {
            return saveLWCPackage();
          }
          return {};
        });
    } else if (!forceCompile && changedFiles.length > 1) {
      let changedFileNames: string = changedFiles
        .map(file => file.FilePath.split('/').pop())
        .join(',');
      return notifications
        .showWarning(
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
      return deployFiles(files, cancellationToken, vscode.window.forceCode.storageRoot);
    });
  }
}
