import * as vscode from 'vscode';
import * as forceCode from '../forceCode';
import { codeCovViewService, saveHistoryService, saveService, notifications, dxService } from '../services';
import {
  saveAura,
  saveApex,
  saveLWC,
  getAuraDefTypeFromDocument,
  createPackageXML,
  deployFiles,
  FCCancellationToken,
  ForcecodeCommand,
} from '.';
import { parseString } from 'xml2js';
import * as path from 'path';
import { isEmptyUndOrNull, toArray } from '../util';
import {
  getAnyTTMetadataFromPath,
  getToolingTypeFromFolder,
  getName,
  getWholeFileName,
} from '../parsers';

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

  public async command(context: any, selectedResource?: any) {
    selectedResource = selectedResource ? true : false;
    let document: string | undefined = vscode.window.activeTextEditor?.document.fileName;
    if (context) {
      if (context.uri) {
        context = context.uri;
      }
      document = context.fsPath;
    }
    if (!document) {
      return;
    }
    return saveService.saveFile(document, selectedResource, this.cancellationToken);
  }
}

export class ForceCompile extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.forceCompile';
    this.hidden = true;
  }

  public command(context: any) {
    return vscode.commands.executeCommand('ForceCode.compile', context, true);
  }
}

export async function compile(
  thePath: string,
  forceCompile: boolean,
  cancellationToken: FCCancellationToken
): Promise<boolean> {
  if (!thePath) {
    return Promise.resolve(false);
  }
  const document: vscode.TextDocument = await vscode.workspace.openTextDocument(thePath);
  if (document.fileName.indexOf(vscode.window.forceCode.projectRoot + path.sep) === -1) {
    notifications.showError(
      "The file you are trying to save to the server isn't in the current org's source folder (" +
        vscode.window.forceCode.projectRoot +
        ')'
    );
    return Promise.resolve(false);
  }

  let diagnosticCollection: vscode.DiagnosticCollection =
    vscode.window.forceCode.fcDiagnosticCollection;
  diagnosticCollection.delete(document.uri);
  let diagnostics: vscode.Diagnostic[] = [];
  let exDiagnostics: vscode.Diagnostic[] = vscode.languages.getDiagnostics(document.uri);

  const toolingType: string | undefined = getToolingTypeFromFolder(document.uri);
  const ttMeta: forceCode.IMetadataObject | undefined = getAnyTTMetadataFromPath(document.fileName);
  const folderToolingType: string | undefined = ttMeta?.xmlName;
  const name: string | undefined = getName(document, toolingType);

  let DefType: string | undefined;
  let Metadata: {} | undefined;
  let errMessages: string[] = [];

  if (folderToolingType === 'StaticResource') {
    return Promise.reject(
      'To save a static resource you must edit the files contained in the resource-bundles folder, not the staticresources folder.'
    );
  }

  if (document.fileName.endsWith('-meta.xml')) {
    let tmpMeta = await new Promise((resolve, reject) => {
      parseString(document.getText(), { explicitArray: false }, function (err, dom) {
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
      (res) => {
        return res;
      },
      (reason) => {
        return reason;
      }
    );
    if (tmpMeta instanceof Error) {
      return Promise.resolve(tmpMeta).then(finished).then(updateSaveHistory);
    }
  }

  // Start doing stuff
  let result;
  try {
    if (folderToolingType === 'EmailTemplate' || folderToolingType === 'Document') {
      await createPackageXML([document.fileName], vscode.window.forceCode.storageRoot);
      const files: string[] = [];
      let pathSplit = 'documents';
      if (folderToolingType === 'EmailTemplate') {
        pathSplit = 'email';
      }
      let foldName: string | undefined = document.fileName
        .split(path.sep + pathSplit + path.sep)
        .pop();
      if (foldName) {
        //foldName = foldName.substring(0, foldName.lastIndexOf('.'));
        files.push(path.join(pathSplit, foldName));
        files.push(path.join(pathSplit, foldName + '-meta.xml'));
        files.push('package.xml');
        result = await deployFiles(files, cancellationToken, vscode.window.forceCode.storageRoot);
      } else {
        return Promise.reject(false);
      }
    } else if (folderToolingType && toolingType === undefined) {
      await createPackageXML([document.fileName], vscode.window.forceCode.storageRoot);
      const files: string[] = [];
      let pathSplit: string[] = document.fileName.split(path.sep);
      //foldName = foldName.substring(0, foldName.lastIndexOf('.'));
      files.push(path.join(pathSplit[pathSplit.length - 2], pathSplit[pathSplit.length - 1]));
      files.push('package.xml');
      result = await deployFiles(files, cancellationToken, vscode.window.forceCode.storageRoot);
    } else if (toolingType === 'AuraDefinition') {
      DefType = getAuraDefTypeFromDocument(document);
      result = await saveAura(document, name, cancellationToken, Metadata, forceCompile);
    } else if (toolingType === 'LightningComponentResource') {
      result = await saveLWC(document, name, cancellationToken, forceCompile);
    } else if (ttMeta && toolingType) {
      // This process uses the Tooling API to compile special files like Classes, Triggers, Pages, and Components
      result = await saveApex(document, ttMeta, cancellationToken, Metadata, forceCompile);
    } else {
      return Promise.reject({ message: 'Metadata Describe Error. Please try again.' });
    }
    await finished(result);
  } catch (error) {
    await finished(error);
  } finally {
    let retVal = updateSaveHistory();
    if (errMessages.length == 1 && errMessages[0].indexOf('expired access/refresh token') !== -1) {
      return Promise.reject(errMessages[0]);
    }
    return Promise.resolve(retVal);
  }

  async function finished(res: any): Promise<boolean> {
    if (isEmptyUndOrNull(res)) {
      notifications.showStatus(`${name} ${DefType || ''} $(check)`);
      return true;
    }
    let failures: number = 0;
    if (res instanceof Error) {
      onError(res);
      failures++;
    } else if (res.records?.length > 0) {
      res.records
        .filter((r: any) => r.State !== 'Error')
        .forEach((containerAsyncRequest: any) => {
          containerAsyncRequest.DeployDetails.componentFailures.forEach((failure: any) => {
            onComponentError(failure);
            failures++;
          });
        });
    } else if (res.errors?.length > 0) {
      // We got an error with the container
      res.errors.forEach((err: any) => {
        onError(err);
        failures++;
      });
    } else if (res.State === 'Error') {
      onError(res);
      failures++;
    } else if (res.status === 'Failed') {
      if(res.id) {
        // grab the error via sfdx command
        let deployDetails = await dxService.getDeployErrors(res.id, cancellationToken);
        toArray(deployDetails.details.componentFailures).forEach((failure: any) => {
          onComponentError(failure);
          failures++;
        });
      } else if(!res.message) {
        // capture a failed deployment there is no message returned, so guide user to view in Salesforce
        errMessages.push(
          'Deployment failed. Please view the details in the deployment status section in Salesforce.'
        );
        return false; // don't show the failed build error
      }
      
    }

    if (failures === 0) {
      // SUCCESS !!!
      if (res.records && res.records[0].DeployDetails.componentSuccesses.length > 0) {
        const fcfile = codeCovViewService.findById(
          res.records[0].DeployDetails.componentSuccesses[0].id
        );
        if (fcfile) {
          fcfile.clearCoverage();
        }
      }
      notifications.showStatus(`${name} ${DefType || ''} $(check)`);
      return true;
    } else if (diagnostics.length === 0 && errMessages.length === 0) {
      notifications.showError(res.message || res);
    }
    if (errMessages.length == 1 && errMessages[0].indexOf('expired access/refresh token') !== -1) {
      return false;
    }
    notifications.showError(
      'File not saved due to build errors. Please open the Problems panel for more details.'
    );
    return false;
  }

  function onComponentError(failure: any) {
    if (failure.problemType === 'Error') {
      failure.lineNumber =
        failure.lineNumber == null || failure.lineNumber < 1 ? 1 : failure.lineNumber;
      failure.columnNumber = failure.columnNumber == null ? 0 : failure.columnNumber;

      let failureRange: vscode.Range = document.lineAt(failure.lineNumber - 1).range;
      if (failure.columnNumber - 1 >= 0) {
        failureRange = failureRange.with(
          new vscode.Position(failure.lineNumber - 1, failure.columnNumber - 1)
        );
      }
      if (
        !exDiagnostics.find((exDia) => {
          return exDia.message === failure.problem;
        })
      ) {
        diagnostics.push(new vscode.Diagnostic(failureRange, failure.problem, 0));
        diagnosticCollection.set(document.uri, diagnostics);
      }
      errMessages.push(failure.problem);
    }
  }

  function onError(err: any): boolean {
    const errMsg: string = err.message || err;
    if (!errMsg) {
      return false;
    }
    // make sure we refresh an expired token
    if (errMsg.indexOf('expired access/refresh token') !== -1) {
      errMessages.push(errMsg);
      return false;
    }
    let theerr: string;
    let failureLineNumber: number = 1;
    let failureColumnNumber: number = 0;
    try {
      const matchRegex = /:(\d+),(\d+):|:(\d+),(\d+) :|\[(\d+),(\d+)\]/; // this will match :12,3432: :12,3432 : and [12,3432]
      let errSplit = errMsg.split('Message:').pop();
      theerr = errSplit || errMsg;
      errSplit = theerr.split(': Source').shift();
      theerr = errSplit || theerr;
      let match = errMsg.match(matchRegex);
      if (match) {
        match = match.filter((mat) => mat); // eliminate all undefined elements
        errSplit = theerr.split(match[0]).pop();
        theerr = (errSplit || theerr).trim(); // remove the line information from the error message if 'Message:' wasn't part of the string
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
    let failureRange: vscode.Range = document.lineAt(failureLineNumber - 1).range;
    if (failureColumnNumber - 1 >= 0) {
      failureRange = failureRange.with(
        new vscode.Position(failureLineNumber - 1, failureColumnNumber)
      );
    }
    if (
      !exDiagnostics.find((exDia) => {
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
      fileName: getWholeFileName(document) || 'UNKNOWN',
      path: document.fileName,
      success: errMessages.length === 0,
      messages: errMessages,
    });
    return errMessages.length === 0;
  }
}
