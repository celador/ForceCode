import * as vscode from 'vscode';
import * as parsers from './../parsers';
import * as forceCode from './../forceCode';
import { codeCovViewService, dxService } from '../services';
import { saveAura, getAuraDefTypeFromDocument } from './saveAura';
import { saveApex } from './saveApex';
import { getAnyTTFromFolder } from '../parsers/open';
import { parseString } from 'xml2js';
import * as path from 'path';
import { saveLWC } from './saveLWC';
import { createPackageXML, deployFiles } from './deploy';

export default function compile(
  document: vscode.TextDocument,
  forceCompile: boolean
): Promise<any> {
  if (!document) {
    return Promise.resolve();
  }
  if (document.uri.fsPath.indexOf(vscode.window.forceCode.projectRoot + path.sep) === -1) {
    vscode.window.showErrorMessage(
      "The file you are trying to save to the server isn't in the current org's source folder (" +
        vscode.window.forceCode.projectRoot +
        ')'
    );
    return Promise.resolve();
  }

  var diagnosticCollection: vscode.DiagnosticCollection =
    vscode.window.forceCode.fcDiagnosticCollection;
  diagnosticCollection.delete(document.uri);
  var diagnostics: vscode.Diagnostic[] = [];
  var exDiagnostics: vscode.Diagnostic[] = vscode.languages.getDiagnostics(document.uri);

  const toolingType: string = parsers.getToolingType(document);
  const folderToolingType: string = getAnyTTFromFolder(document.uri);
  const fileName: string = parsers.getFileName(document);
  const name: string = parsers.getName(document, toolingType);

  var DefType: string = undefined;
  var Metadata: {} = undefined;

  if (folderToolingType === 'StaticResource') {
    return Promise.reject(
      'To save a static resource you must edit the files contained in the resource-bundles folder, not the staticresources folder.'
    );
  }

  if (document.fileName.endsWith('-meta.xml')) {
    parseString(document.getText(), { explicitArray: false }, function(err, dom) {
      if (err) {
        return Promise.reject(err);
      } else {
        const metadataType: string = Object.keys(dom)[0];
        delete dom[metadataType].$;
        Metadata = dom[metadataType];
      }
    });
  }

  // Start doing stuff
  if (folderToolingType === 'EmailTemplate' || folderToolingType === 'Document') {
    return createPackageXML([document.fileName], vscode.window.forceCode.storageRoot)
      .then(() => {
        const files: string[] = [];
        var pathSplit = 'documents';
        if (folderToolingType === 'EmailTemplate') {
          pathSplit = 'email';
        }
        var foldName: string = document.fileName.split(path.sep + pathSplit + path.sep).pop();
        //foldName = foldName.substring(0, foldName.lastIndexOf('.'));
        files.push(path.join(pathSplit, foldName));
        files.push(path.join(pathSplit, foldName + '-meta.xml'));
        files.push('package.xml');
        return deployFiles(files, vscode.window.forceCode.storageRoot);
      })
      .then(finished)
      .catch(onError);
  } else if (folderToolingType && toolingType === undefined) {
    // This process uses the Metadata API to deploy specific files
    // This is where we extend it to create any kind of metadata
    // Currently only Objects and Permission sets ...
    return Promise.resolve(vscode.window.forceCode)
      .then(createMetaData)
      .then(compileMetadata)
      .then(reportMetadataResults)
      .then(finished)
      .catch(onError);
  } else if (toolingType === undefined) {
    return Promise.reject({ message: 'Metadata Describe Error. Please try again.' });
  } else if (toolingType === 'AuraDefinition') {
    DefType = getAuraDefTypeFromDocument(document);
    return saveAura(document, toolingType, Metadata, forceCompile)
      .then(finished)
      .catch(onError);
  } else if (toolingType === 'LightningComponentResource') {
    return saveLWC(document, toolingType, forceCompile)
      .then(finished)
      .catch(onError);
  } else {
    // This process uses the Tooling API to compile special files like Classes, Triggers, Pages, and Components
    return saveApex(document, toolingType, Metadata, forceCompile)
      .then(finished)
      .then(res => vscode.window.forceCode.newContainer(res))
      .catch(onError);
  }

  // =======================================================================================================================================
  // ================================                  All Metadata                  ===========================================
  // =======================================================================================================================================

  function createMetaData() {
    let text: string = document.getText();

    return new Promise(function(resolve, reject) {
      if (Metadata) {
        resolve(Metadata);
      }
      const ffNameParts: string[] = document.fileName
        .split(vscode.window.forceCode.projectRoot + path.sep)[1]
        .split(path.sep);
      var folderedName: string;
      if (ffNameParts.length > 2) {
        // we have foldered metadata
        ffNameParts.shift();
        folderedName = ffNameParts.join('/').split('.')[0];
      }
      parseString(text, { explicitArray: false, async: true }, function(err, result) {
        if (err) {
          reject(err);
        }
        var metadata: any = result[folderToolingType];
        if (metadata) {
          delete metadata['$'];
          delete metadata['_'];
          metadata.fullName = folderedName ? folderedName : fileName;
          resolve(metadata);
        }
        reject({ message: folderToolingType + ' metadata type not found in org' });
      });
    });
  }

  function compileMetadata(metadata) {
    return vscode.window.forceCode.conn.metadata.upsert(folderToolingType, [metadata]);
  }

  function reportMetadataResults(result) {
    if (Array.isArray(result) && result.length && !result.some(i => !i.success)) {
      vscode.window.forceCode.showStatus('Successfully deployed ' + result[0].fullName);
      return result;
    } else if (Array.isArray(result) && result.length && result.some(i => !i.success)) {
      let error: string =
        result
          .filter(i => !i.success)
          .map(i => i.fullName)
          .join(', ') + ' Failed';
      vscode.window.showErrorMessage(error);
      throw { message: error };
    } else if (typeof result === 'object' && result.success) {
      vscode.window.forceCode.showStatus('Successfully deployed ' + result.fullName);
      return result;
    } else {
      var error: any = result.errors ? result.errors[0] : 'Unknown Error';
      vscode.window.showErrorMessage(error);
      throw { message: error };
    }
  }

  // =======================================================================================================================================
  function finished(res: any): boolean {
    if (dxService.isEmptyUndOrNull(res)) {
      vscode.window.forceCode.showStatus(`${name} ${DefType ? DefType : ''} $(check)`);
      return true;
    }
    var failures: number = 0;
    if (res.records && res.records.length > 0) {
      res.records
        .filter(r => r.State !== 'Error')
        .forEach(containerAsyncRequest => {
          containerAsyncRequest.DeployDetails.componentFailures.forEach(failure => {
            if (failure.problemType === 'Error') {
              failure.lineNumber =
                failure.lineNumber == null || failure.lineNumber < 1 ? 1 : failure.lineNumber;
              failure.columnNumber = failure.columnNumber == null ? 0 : failure.columnNumber;

              var failureRange: vscode.Range = document.lineAt(failure.lineNumber - 1).range;
              if (failure.columnNumber - 1 >= 0) {
                failureRange = failureRange.with(
                  new vscode.Position(failure.lineNumber - 1, failure.columnNumber - 1)
                );
              }
              if (
                !exDiagnostics.find(exDia => {
                  return exDia.message === failure.problem;
                })
              ) {
                diagnostics.push(new vscode.Diagnostic(failureRange, failure.problem, 0));
                diagnosticCollection.set(document.uri, diagnostics);
              }
              failures++;
            }
          });
        });
    } else if (res.errors && res.errors.length > 0) {
      // We got an error with the container
      res.errors.forEach(err => {
        onError(err);
        failures++;
      });
    } else if (res.State === 'Error') {
      onError(res);
      failures++;
    }

    if (failures === 0) {
      // SUCCESS !!!
      if (res.records && res.records[0].DeployDetails.componentSuccesses.length > 0) {
        const fcfile = codeCovViewService.findById(
          res.records[0].DeployDetails.componentSuccesses[0].id
        );
        if (fcfile) {
          var fcMem: forceCode.IWorkspaceMember = fcfile.getWsMember();
          fcMem.coverage = undefined;
          fcfile.updateWsMember(fcMem);
        }
      }
      vscode.window.forceCode.showStatus(`${name} ${DefType ? DefType : ''} $(check)`);
      return true;
    } else if (diagnostics.length === 0) {
      vscode.window.showErrorMessage(res.message ? res.message : res);
    }
    vscode.window.showErrorMessage(
      'File not saved due to build errors. Please open the Problems panel for more details.'
    );
    return false;
  }

  function onError(err) {
    const errMsg: string = err.message ? err.message : err;
    if (!errMsg) {
      return false;
    }
    // make sure we refresh an expired token
    if (errMsg.indexOf('expired access/refresh token') !== -1) {
      throw err;
    }
    const matchRegex = /:(\d+),(\d+):|:(\d+),(\d+) :|\[(\d+),(\d+)\]/; // this will match :12,3432: :12,3432 : and [12,3432]
    var theerr = errMsg
      .split('Message:')
      .pop()
      .split(': Source')
      .shift();
    var match = errMsg.match(matchRegex);
    var failureLineNumber: number = 1;
    var failureColumnNumber: number = 0;
    if (match) {
      match = match.filter(mat => mat); // eliminate all undefined elements
      theerr = theerr
        .split(match[0])
        .pop()
        .trim(); // remove the line information from the error message if 'Message:' wasn't part of the string
      const row = match[1];
      const col = match[2];
      failureLineNumber = Number.parseInt(row);
      failureLineNumber =
        failureLineNumber < 1 || failureLineNumber > document.lineCount ? 1 : failureLineNumber;
      failureColumnNumber = Number.parseInt(col);
    }
    var failureRange: vscode.Range = document.lineAt(failureLineNumber - 1).range;
    if (failureColumnNumber - 1 >= 0) {
      failureRange = failureRange.with(
        new vscode.Position(failureLineNumber - 1, failureColumnNumber)
      );
    }
    if (
      !exDiagnostics.find(exDia => {
        return exDia.message === theerr;
      })
    ) {
      diagnostics.push(new vscode.Diagnostic(failureRange, theerr, 0));
      diagnosticCollection.set(document.uri, diagnostics);
    }
  }
}
