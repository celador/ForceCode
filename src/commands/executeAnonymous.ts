import * as vscode from 'vscode';
import * as error from './../util/error';
import { configuration } from './../services';
import * as jsforce from 'jsforce';
import * as logging from './../providers/LogProvider';

export interface IExecuteAnonymousService {
    userId?: string;
    queryString?: string;
    connection?: jsforce.Connection;
    apexBody?: string;
    traceFlagId?: string;
    logId?: string;
};

export default function executeAnonymous(document: vscode.TextDocument, context: vscode.ExtensionContext): any {
    const editor = vscode.window.activeTextEditor;
    var selection = editor.selection;
    var text = editor.document.getText(selection);
    if(text === '')
    {
        vscode.window.forceCode.statusBarItem.text = 'No text selected to execute, please select code to run...';
        vscode.window.forceCode.resetMenu();
        return;
    }
    return vscode.window.forceCode.connect(context)
        .then(svc => invokeExecuteAnonymous(text))
        .then(res => runDiagnostics(res, document, selection))
        .then(showResult)
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));

    // =========================================================================================================
    // =====================       USING SOAP API      =========================================================
    // =========================================================================================================
    function invokeExecuteAnonymous(text: string): jsforce.ExecuteAnonymousResponse {
        vscode.window.forceCode.statusBarItem.text = 'ForceCode: $(pulse) Executing $(pulse)';
        vscode.window.forceCode.conn.debuggingHeader = vscode.window.forceCode.conn.debuggingHeader ? vscode.window.forceCode.conn.debuggingHeader : {};
        vscode.window.forceCode.conn.debuggingHeader['@xmlns'] = 'http://soap.sforce.com/2006/08/apex';
        vscode.window.forceCode.conn.debuggingHeader['categories'] = [
            {
                'category': 'Apex_code',
                'level': 'DEBUG',
            }, {
                'category': 'Apex_profiling',
                'level': 'DEBUG',
            }, {
                'category': 'Callout',
                'level': 'DEBUG',
            }, {
                'category': 'Db',
                'level': 'DEBUG',
            }, {
                'category': 'System',
                'level': 'DEBUG',
            }, {
                'category': 'Validation',
                'level': 'DEBUG',
            }, {
                'category': 'Visualforce',
                'level': 'DEBUG',
            }, {
                'category': 'Workflow',
                'level': 'DEBUG',
            },
        ];
        return vscode.window.forceCode.conn.soap.executeAnonymous(text).then(function (res) {
            return res;
        });
    }

    function runDiagnostics(res: jsforce.ExecuteAnonymousResponse, _document: vscode.TextDocument, sel: any) {
        // Create a diagnostic Collection for the current file.  Overwriting the last...
        var diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(_document.fileName);
        var diagnostics: vscode.Diagnostic[] = [];
        var result: any = res.body.result;
        // var header: any = res.header;
        if (result.compiled === 'false') {
            const lineNumber: number = Number(result.line) - 1 + sel.start.line;
            var col = 0;
            if(lineNumber === sel.start.line) {
                col = sel.start.character;
            }
            const columnNumber: number = Number(result.column) - 1 + col;
            var failureRange: vscode.Range = _document.lineAt(lineNumber).range;
            if (columnNumber > 0) {
                failureRange = failureRange.with(new vscode.Position(lineNumber, columnNumber));
            }
            diagnostics.push(new vscode.Diagnostic(failureRange, result.compileProblem));
        }
        diagnosticCollection.set(_document.uri, diagnostics);
        // TODO: Make the Success message derive from the componentSuccesses, maybe similar to above code for failures
        if (diagnostics.length > 0) {
            vscode.window.forceCode.statusBarItem.text = `ForceCode: Execute Anonymous Errors $(alert)`;
            diagnostics.forEach(d => vscode.window.forceCode.outputChannel.appendLine(`Line ${Number(result.line)}: ${d.message}`));
        } else {
            vscode.window.forceCode.statusBarItem.text = `ForceCode: Execute Anonymous Success $(check)`;
        }
        return res;
    }

    function showResult(res) {
        vscode.window.forceCode.resetMenu();
        return configuration().then(config => {
            vscode.window.forceCode.outputChannel.clear();
            vscode.window.forceCode.outputChannel.appendLine(logging.filterLog(res.header.debugLog));
            vscode.window.forceCode.outputChannel.show();
            return res;
        });
    }

}
