import * as vscode from 'vscode';
import * as logging from './../providers/LogProvider';
import { ExecuteAnonymousResult } from '../services/dxService';
import { dxService } from '../services';

export default function executeAnonymous(document: vscode.TextDocument): any {
  const editor = vscode.window.activeTextEditor;
  var selection = editor.selection;
  var text = editor.document.getText(selection);
  if (text === '') {
    vscode.window.showErrorMessage('No text selected to execute, please select code to run...');
    return;
  }

  // we need to put the selected text in a temp file and then send it off to sfdx to run
  return dxService.saveToFile(text, 'execAnon.tmp').then(path => {
    return dxService
      .execAnon(path)
      .then(
        res => {
          dxService.removeFile('execAnon.tmp');
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
    // TODO: Make the Success message derive from the componentSuccesses, maybe similar to above code for failures
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
