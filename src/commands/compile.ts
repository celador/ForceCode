import * as vscode from 'vscode';
import * as parsers from './../parsers';
import * as forceCode from './../forceCode';
import { codeCovViewService, saveHistoryService, saveService, notifications } from '../services';
import { saveAura, getAuraDefTypeFromDocument } from './saveAura';
import { saveApex } from './saveApex';
import { getAnyTTFromFolder } from '../parsers/open';
import { parseString } from 'xml2js';
import * as path from 'path';
import { saveLWC } from './saveLWC';
import { createPackageXML, deployFiles } from './deploy';
import { isEmptyUndOrNull } from '../util';
import { FCCancellationToken, ForcecodeCommand } from './forcecodeCommand';

export class CompileMenu extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.compile';
    this.cancelable = true;
    this.name = 'Saving ';
    this.hidden = false;
    this.description = 'Save the active file to your org.';
    this.detail =
      'If there is an error, you will get notified. To automatically compile Salesforce files on save, set the autoCompile flag to true in your settings file';
    this.icon = 'rocket';
    this.label = 'Compile/Deploy';
  }

  public command(context, selectedResource?) {
    if (context) {
      if (context.uri) {
        context = context.uri;
      }
      return vscode.workspace.openTextDocument(context).then(doc => {
        return saveService.saveFile(doc, selectedResource, this.cancellationToken);
      });
    }
    if (!vscode.window.activeTextEditor) {
      return;
    }
    return saveService.saveFile(
      vscode.window.activeTextEditor.document,
      selectedResource,
      this.cancellationToken
    );
  }
}

export class ForceCompile extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.forceCompile';
    this.hidden = true;
  }

  public command(context, selectedResource?) {
    return vscode.commands.executeCommand('ForceCode.compile', context, true);
  }
}

export default async function compile(
  document: vscode.TextDocument,
  forceCompile: boolean,
  cancellationToken: FCCancellationToken
): Promise<boolean> {
  if (!document) {
    return Promise.resolve(false);
  }
  if (document.uri.fsPath.indexOf(vscode.window.forceCode.projectRoot + path.sep) === -1) {
    notifications.showError(
      "The file you are trying to save to the server isn't in the current org's source folder (" +
        vscode.window.forceCode.projectRoot +
        ')'
    );
    return Promise.resolve(false);
  }

  var diagnosticCollection: vscode.DiagnosticCollection =
    vscode.window.forceCode.fcDiagnosticCollection;
  diagnosticCollection.delete(document.uri);
  var diagnostics: vscode.Diagnostic[] = [];
  var exDiagnostics: vscode.Diagnostic[] = vscode.languages.getDiagnostics(document.uri);

  const toolingType: string | undefined = parsers.getToolingType(document);
  const folderToolingType: string | undefined = getAnyTTFromFolder(document.uri);
  const name: string | undefined = parsers.getName(document, toolingType);

  var DefType: string | undefined;
  var Metadata: {} | undefined;
  var errMessages: string[] = [];

  if (folderToolingType === 'StaticResource') {
    return Promise.reject(
      'To save a static resource you must edit the files contained in the resource-bundles folder, not the staticresources folder.'
    );
  }

  if (document.fileName.endsWith('-meta.xml')) {
    var tmpMeta = await new Promise((resolve, reject) => {
      parseString(document.getText(), { explicitArray: false }, function(err, dom) {
        if (err) {
          return reject(err);
        } else {
          const metadataType: string = Object.keys(dom)[0];
          delete dom[metadataType].$;
          Metadata = dom[metadataType];
          return resolve(Metadata);
        }
      });
    }).then(
      res => {
        return res;
      },
      reason => {
        return reason;
      }
    );
    if (tmpMeta instanceof Error) {
      return Promise.resolve(tmpMeta)
        .then(finished)
        .then(updateSaveHistory);
    }
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
        var foldName: string | undefined = document.fileName
          .split(path.sep + pathSplit + path.sep)
          .pop();
        if (foldName) {
          //foldName = foldName.substring(0, foldName.lastIndexOf('.'));
          files.push(path.join(pathSplit, foldName));
          files.push(path.join(pathSplit, foldName + '-meta.xml'));
          files.push('package.xml');
          return deployFiles(files, cancellationToken, vscode.window.forceCode.storageRoot);
        } else {
          return Promise.reject(false);
        }
      })
      .then(finished)
      .catch(finished)
      .then(updateSaveHistory);
  } else if (folderToolingType && toolingType === undefined) {
    return createPackageXML([document.fileName], vscode.window.forceCode.storageRoot)
      .then(() => {
        const files: string[] = [];
        var pathSplit: string[] = document.fileName.split(path.sep);
        //foldName = foldName.substring(0, foldName.lastIndexOf('.'));
        files.push(path.join(pathSplit[pathSplit.length - 2], pathSplit[pathSplit.length - 1]));
        files.push('package.xml');
        return deployFiles(files, cancellationToken, vscode.window.forceCode.storageRoot);
      })
      .then(finished)
      .catch(finished)
      .then(updateSaveHistory);
  } else if (toolingType === undefined) {
    return Promise.reject({ message: 'Metadata Describe Error. Please try again.' });
  } else if (toolingType === 'AuraDefinition') {
    DefType = getAuraDefTypeFromDocument(document);
    return saveAura(document, toolingType, cancellationToken, Metadata, forceCompile)
      .then(finished)
      .catch(finished)
      .then(updateSaveHistory);
  } else if (toolingType === 'LightningComponentResource') {
    return saveLWC(document, toolingType, cancellationToken, forceCompile)
      .then(finished)
      .catch(finished)
      .then(updateSaveHistory);
  } else {
    // This process uses the Tooling API to compile special files like Classes, Triggers, Pages, and Components
    return saveApex(document, toolingType, cancellationToken, Metadata, forceCompile)
      .then(finished)
      .then(res => {
        return vscode.window.forceCode.newContainer(res).then(() => {
          return true;
        });
      })
      .catch(finished)
      .then(updateSaveHistory);
  }

  function finished(res: any): boolean {
    if (isEmptyUndOrNull(res)) {
      notifications.showStatus(`${name} ${DefType ? DefType : ''} $(check)`);
      return true;
    }
    var failures: number = 0;
    if (res instanceof Error) {
      onError(res);
      failures++;
    } else if (res.records && res.records.length > 0) {
      res.records
        .filter((r: any) => r.State !== 'Error')
        .forEach((containerAsyncRequest: any) => {
          containerAsyncRequest.DeployDetails.componentFailures.forEach((failure: any) => {
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
              errMessages.push(failure.problem);
              failures++;
            }
          });
        });
    } else if (res.errors && res.errors.length > 0) {
      // We got an error with the container
      res.errors.forEach((err: any) => {
        onError(err);
        failures++;
      });
    } else if (res.State === 'Error') {
      onError(res);
      failures++;
    } else if (res.status === 'Failed') {
      if (res.message) {
        errMessages.push(res.message);
      } else {
        // capture a failed deployment there is no message returned, so guide user to view in Salesforce
        errMessages.push(
          'Deployment failed. Please view the details in the deployment status section in Salesforce.'
        );
      }
      return false; // don't show the failed build error
    }

    if (failures === 0) {
      // SUCCESS !!!
      if (res.records && res.records[0].DeployDetails.componentSuccesses.length > 0) {
        const fcfile = codeCovViewService.findById(
          res.records[0].DeployDetails.componentSuccesses[0].id
        );
        if (fcfile) {
          var fcMem: forceCode.IWorkspaceMember = fcfile.getWsMember();
          if (fcMem.coverage) {
            fcMem.coverage = undefined;
            fcfile.updateWsMember(fcMem);
          }
        }
      }
      notifications.showStatus(`${name} ${DefType ? DefType : ''} $(check)`);
      return true;
    } else if (diagnostics.length === 0 && errMessages.length === 0) {
      notifications.showError(res.message ? res.message : res);
    }
    notifications.showError(
      'File not saved due to build errors. Please open the Problems panel for more details.'
    );
    return false;
  }

  function onError(err: any): boolean {
    const errMsg: string = err.message ? err.message : err;
    if (!errMsg) {
      return false;
    }
    // make sure we refresh an expired token
    if (errMsg.indexOf('expired access/refresh token') !== -1) {
      throw err;
    }
    var theerr: string;
    var failureLineNumber: number = 1;
    var failureColumnNumber: number = 0;
    try {
      const matchRegex = /:(\d+),(\d+):|:(\d+),(\d+) :|\[(\d+),(\d+)\]/; // this will match :12,3432: :12,3432 : and [12,3432]
      var errSplit = errMsg.split('Message:').pop();
      theerr = errSplit ? errSplit : errMsg;
      errSplit = theerr.split(': Source').shift();
      theerr = errSplit ? errSplit : theerr;
      var match = errMsg.match(matchRegex);
      if (match) {
        match = match.filter(mat => mat); // eliminate all undefined elements
        errSplit = theerr.split(match[0]).pop();
        theerr = (errSplit ? errSplit : theerr).trim(); // remove the line information from the error message if 'Message:' wasn't part of the string
        const row = match[1];
        const col = match[2];
        failureLineNumber = Number.parseInt(row);
        failureLineNumber =
          failureLineNumber < 1 || failureLineNumber > document.lineCount ? 1 : failureLineNumber;
        failureColumnNumber = Number.parseInt(col);
      }
    } catch (e) {
      theerr = errMsg;
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
    errMessages.push(theerr);
    return false;
  }

  function updateSaveHistory(): boolean {
    saveHistoryService.addSaveResult({
      fileName: parsers.getWholeFileName(document) || 'UNKNOWN',
      path: document.fileName,
      success: errMessages.length === 0,
      messages: errMessages,
    });
    return errMessages.length === 0;
  }
}
