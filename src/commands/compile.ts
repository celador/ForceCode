import * as vscode from 'vscode';
import * as parsers from './../parsers';
import sleep from './../util/sleep';
// import {constants} from './../services';
const UPDATE: boolean = true;
const CREATE: boolean = false;

export default function compile(document: vscode.TextDocument, context: vscode.ExtensionContext): Promise<any> {
  'use strict';
  vscode.window.setStatusBarMessage('ForceCode: Compiling...');

  const body: string = document.getText();
  const toolingType: string = parsers.getToolingType(document);
  if (toolingType === undefined) {
    return Promise
      .reject({ message: 'Unknown Tooling Type.  Ensure the body is well formed' })
      .catch(onError);
  }
  const name: string = parsers.getName(document, toolingType);
  return vscode.window.forceCode.connect(context)
    .then(svc => svc.newContainer())
    .then(addToContainer)
    .then(requestCompile)
    .then(getCompileStatus)
    .then(finished, onError);
  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================
  function addToContainer() {
    return vscode.window.forceCode.conn.tooling.sobject(toolingType)
      .find({ Name: name }).execute()
      .then(records => addMember(records));
    function addMember(records) {
      if (records.length > 0) {
        // Tooling Object already exists
        //  UPDATE it
        var record: { Id: string, Metadata: {} } = records[0];
        var member: {} = {
          Body: body,
          ContentEntityId: record.Id,
          Id: vscode.window.forceCode.containerId,
          Metadata: record.Metadata,
          MetadataContainerId: vscode.window.forceCode.containerId,
        };
        // outputChannel.appendLine('ForceCode: Updating ' + name);
        vscode.window.setStatusBarMessage('ForceCode: Updating ' + name);
        return vscode.window.forceCode.conn.tooling.sobject(parsers.getToolingType(document, UPDATE)).create(member).then(res => {
          return vscode.window.forceCode;
        });
      } else {
        // Tooling Object does not exist
        // CREATE it
        // outputChannel.appendLine('ForceCode: Creating ' + name);
        vscode.window.setStatusBarMessage('ForceCode: Creating ' + name);
        return vscode.window.forceCode.conn.tooling.sobject(parsers.getToolingType(document, CREATE)).create(createObject(body)).then(foo => {
          return vscode.window.forceCode;
        });
      }
    }
    function createObject(text: string): {} {
      if (toolingType === 'ApexClass') {
        return { Body: text };
      } else if (toolingType === 'ApexPage') {
        return {
          Markup: text,
          Masterlabel: name + 'Label',
          Name: name,
        };
      }
      return { Body: text };
    }
  }
  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================
  function requestCompile() {
    vscode.window.setStatusBarMessage('ForceCode: Compile Requested');
    return vscode.window.forceCode.conn.tooling.sobject('ContainerAsyncRequest').create({
      IsCheckOnly: false,
      IsRunTests: false,
      MetadataContainerId: vscode.window.forceCode.containerId,
    }).then(res => {
      vscode.window.forceCode.containerAsyncRequestId = res.id;
      return vscode.window.forceCode;
    });
  }
  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================
  function getCompileStatus() {
    var checkCount: number = 0;
    return nextStatus();
    function nextStatus() {
      checkCount += 1;
      // Set a timeout to auto fail the compile after 30 seconds
      vscode.window.setStatusBarMessage('ForceCode: Get Status...' + checkCount);
      return getStatus().then(res => {
        // Throttle the ReCheck of the compile status, to use fewer http requests (reduce effects on SFDC limits)
        if (isFinished(res)) {
          return res;
        } else if (checkCount > 30) {
          throw 'Timeout';
        } else {
          return sleep(1000).then(nextStatus);
        }
      });
    }
    function getStatus() {
      return vscode.window.forceCode.conn.tooling.query(`SELECT Id, MetadataContainerId, MetadataContainerMemberId, State, IsCheckOnly, ` +
        `DeployDetails, ErrorMsg FROM ContainerAsyncRequest WHERE Id='${vscode.window.forceCode.containerAsyncRequestId}'`);
    }
    function isFinished(res) {
      if (res.records && res.records[0]) {
        if (res.records.some(record => record.State === 'Queued')) {
          return false;
        } else {
          // Completed, Failed, Invalidated, Error, Aborted
          return true;
        }
      }
      return true;
    }
  }
  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================
  function finished(res): boolean {
    // Create a diagnostic Collection for the current file.  Overwriting the last...
    var diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(document.fileName);
    var diagnostics: vscode.Diagnostic[] = [];
    res.records.forEach(containerAsyncRequest => {
      containerAsyncRequest.DeployDetails.componentFailures.forEach(failure => {
        if (failure.problemType === 'Error') {
          var failureLineNumber: number = failure.lineNumber || failure.LineNumber || 1;
          var failureRange: vscode.Range = document.lineAt(failureLineNumber - 1).range;
          if (failure.columnNumber > 0) {
            failureRange = failureRange.with(new vscode.Position((failureLineNumber - 1), failure.columnNumber));
          }
          diagnostics.push(new vscode.Diagnostic(failureRange, failure.problem, failure.problemType));
        }
      });
      diagnosticCollection.set(document.uri, diagnostics);
    });
    // TODO: Make the Success message derive from the componentSuccesses, maybe similar to above code for failures
    if (diagnostics.length > 0) {
      vscode.window.setStatusBarMessage(`ForceCode: Compile Errors!`);
    } else {
      vscode.window.setStatusBarMessage(`ForceCode: Compile/Deploy of ${name} was successful`);
      // vscode.commands.executeCommand('workbench.action.output.toggleOutput');
      // outputChannel.hide();
    }
    return true;
  }
  // =======================================================================================================================================
  function onError(err): boolean {
    vscode.window.setStatusBarMessage('ForceCode: ' + err.message);
    vscode.window.forceCode.outputChannel.appendLine('================================     ERROR     ================================\n');
    vscode.window.forceCode.outputChannel.appendLine(err.message);
    console.error(err);
    return false;
  }
  // =======================================================================================================================================
}
