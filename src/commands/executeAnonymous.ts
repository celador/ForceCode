import * as vscode from 'vscode';
import * as logging from './../providers/LogProvider';
import { dxService, ExecuteAnonymousResult, notifications } from '../services';
import { saveToFile, removeFile } from '../util';
import { ForcecodeCommand } from './forcecodeCommand';

export class ExecuteAnonymous extends ForcecodeCommand {
  constructor() {
    super();
    this.cancelable = true;
    this.commandName = 'ForceCode.executeAnonymous';
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
      notifications.showError(
        'A text editor needs to be open with Apex code selected in order to user Execute Anonymous'
      );
      return;
    }
    var document: vscode.TextDocument = editor.document;
    var selection = editor.selection;
    var text = document.getText(selection);
    if (text === '') {
      notifications.showError('No text selected to execute, please select code to run...');
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
        notifications.showError(`ForceCode: Execute Anonymous Errors`);
        diagnostics.forEach(d => {
          notifications.writeLog(`Line ${Number(res.line)}: ${d.message}`);
        });
      } else {
        notifications.showStatus(`ForceCode: Execute Anonymous Success $(check)`);
      }
      return res;
    }

    function showResult(res: ExecuteAnonymousResult) {
      const newDocURI: vscode.Uri = vscode.Uri.parse(`untitled:${new Date().toISOString()}.log`);
      const filteredLog: string = logging.filterLog(res.logs);
      if (filteredLog === '') {
        return {
          async then(callback) {
            return callback(res);
          },
        };
      }
      return vscode.workspace
        .openTextDocument(newDocURI)
        .then(function(_document: vscode.TextDocument) {
          return vscode.window.showTextDocument(_document, 3, true).then(editor => {
            editor.edit(edit => {
              return edit.insert(new vscode.Position(0, 0), filteredLog);
            });
          });
        })
        .then(() => {
          return res;
        });
    }
  }
}
