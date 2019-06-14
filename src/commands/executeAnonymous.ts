import * as vscode from 'vscode';
import * as logging from './../providers/LogProvider';
import { dxService, ExecuteAnonymousResult, commandService } from '../services';
import { saveToFile, removeFile } from '../util';
import { ForcecodeCommand } from './forcecodeCommand';

export class ExecuteAnonymousContext extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.executeAnonymous';
    this.hidden = true;
  }

  public command(context, selectedResource?) {
    return commandService.runCommand('ForceCode.executeAnonymousMenu', context, selectedResource);
  }
}

export class ExecuteAnonymous extends ForcecodeCommand {
  constructor() {
    super();
    this.cancelable = true;
    this.commandName = 'ForceCode.executeAnonymousMenu';
    this.name = 'Executing anonymous code';
    this.hidden = false;
    this.description = 'Execute code and get the debug log';
    this.detail =
      'Select some code to run before using this option. You can also right-click after selecting the code.';
    this.icon = 'terminal';
    this.label = 'Execute Anonymous';
  }

  public command(context: any, selectedResource: any): any {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage(
        'A text editor needs to be open with Apex code selected in order to user Execute Anonymous'
      );
      return;
    }
    var document: vscode.TextDocument = context;
    var selection = editor.selection;
    var text = editor.document.getText(selection);
    if (text === '') {
      vscode.window.showErrorMessage('No text selected to execute, please select code to run...');
      return;
    }

    // we need to put the selected text in a temp file and then send it off to sfdx to run
    return saveToFile(text, 'execAnon.tmp').then(path => {
      return dxService
        .execAnon(path, this.cancellationToken)
        .then(
          res => {
            removeFile('execAnon.tmp');
            return res;
          },
          reason => {
            throw reason;
          }
        )
        .then(runDiagnostics)
        .then(showResult);
    });

    function runDiagnostics(res: ExecuteAnonymousResult) {
      // Create a diagnostic Collection for the current file.  Overwriting the last...
      var diagnosticCollection: vscode.DiagnosticCollection =
        vscode.window.forceCode.fcDiagnosticCollection;
      diagnosticCollection.delete(document.uri);
      var diagnostics: vscode.Diagnostic[] = [];
      // var header: any = res.header;
      if (res.compiled === false) {
        const lineNumber: number = Number(res.line) - 1 + selection.start.line;
        var col = 0;
        if (lineNumber === selection.start.line) {
          col = selection.start.character;
        }
        const columnNumber: number = Number(res.column) - 1 + col;
        var failureRange: vscode.Range = document.lineAt(lineNumber < 0 ? 0 : lineNumber).range;
        if (columnNumber >= 0) {
          failureRange = failureRange.with(new vscode.Position(lineNumber, columnNumber));
        }
        diagnostics.push(new vscode.Diagnostic(failureRange, res.compileProblem));
      }
      diagnosticCollection.set(document.uri, diagnostics);
      if (diagnostics.length > 0) {
        vscode.window.showErrorMessage(`ForceCode: Execute Anonymous Errors`);
        diagnostics.forEach(d =>
          vscode.window.forceCode.outputChannel.appendLine(`Line ${Number(res.line)}: ${d.message}`)
        );
      } else {
        vscode.window.forceCode.showStatus(`ForceCode: Execute Anonymous Success $(check)`);
      }
      return res;
    }

    function showResult(res: ExecuteAnonymousResult) {
      vscode.window.forceCode.outputChannel.clear();
      vscode.window.forceCode.outputChannel.appendLine(logging.filterLog(res.logs));
      vscode.window.forceCode.outputChannel.show();
      return res;
    }
  }
}
