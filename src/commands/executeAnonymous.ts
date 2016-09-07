import * as vscode from 'vscode';
import * as error from './../util/error';
import { configuration } from './../services';
import * as jsforce from 'jsforce';

export interface IExecuteAnonymousService {
    userId?: string;
    queryString?: string;
    connection?: jsforce.Connection;
    apexBody?: string;
    traceFlagId?: string;
    logId?: string;
};

export default function executeAnonymous(document: vscode.TextDocument, context: vscode.ExtensionContext): any {
    'use strict';
    let apexBody: string = document.getText();
    // vscode.window.forceCode = vscode.window.forceCode;
    // vscode.window.forceCode.outputChannel = ;
    return vscode.window.forceCode.connect(context)
        .then(svc => invokeExecuteAnonymous(apexBody))
        .then(res => runDiagnostics(res, document))
        .then(showResult)
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));

    // =========================================================================================================
    // =====================       USING SOAP API      =========================================================
    // =========================================================================================================
    function invokeExecuteAnonymous(text: string): jsforce.ExecuteAnonymousResponse {
        vscode.window.setStatusBarMessage("ForceCode: $(pulse) Executing $(pulse)");
        vscode.window.forceCode.conn.debuggingHeader = vscode.window.forceCode.conn.debuggingHeader ? vscode.window.forceCode.conn.debuggingHeader : {};
        vscode.window.forceCode.conn.debuggingHeader['@xmlns'] = 'http://soap.sforce.com/2006/08/apex';
        vscode.window.forceCode.conn.debuggingHeader['categories'] = [
            {
                'category': 'Apex_code',
                'level': 'DEBUG'
            }, {
                'category': 'Apex_profiling',
                'level': 'INFO'
            }, {
                'category': 'Callout',
                'level': 'INFO'
            }, {
                'category': 'Db',
                'level': 'INFO'
            }, {
                'category': 'System',
                'level': 'DEBUG'
            }, {
                'category': 'Validation',
                'level': 'INFO'
            }, {
                'category': 'Visualforce',
                'level': 'INFO'
            }, {
                'category': 'Workflow',
                'level': 'INFO'
            }
        ];
        return vscode.window.forceCode.conn.soap.executeAnonymous(text).then(function (res) {
            return res;
        });
    }
    function runDiagnostics(res: jsforce.ExecuteAnonymousResponse, document: vscode.TextDocument) {
        // Create a diagnostic Collection for the current file.  Overwriting the last...
        var diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(document.fileName);
        var diagnostics: vscode.Diagnostic[] = [];
        var result: any = res.body.result;
        var header: any = res.header;
        if (result.compiled === 'false') {
            const lineNumber: number = Number(result.line) - 1;
            const columnNumber: number = Number(result.column);
            var failureRange: vscode.Range = document.lineAt(lineNumber).range;
            if (columnNumber > 0) {
                failureRange = failureRange.with(new vscode.Position(lineNumber, columnNumber));
            }
            diagnostics.push(new vscode.Diagnostic(failureRange, result.compileProblem));
        }
        diagnosticCollection.set(document.uri, diagnostics);
        // TODO: Make the Success message derive from the componentSuccesses, maybe similar to above code for failures
        if (diagnostics.length > 0) {
            vscode.window.setStatusBarMessage(`ForceCode: Execute Anonymous Errors $(alert)`);
            diagnostics.forEach(d => vscode.window.forceCode.outputChannel.appendLine(`Line ${Number(result.line)}: ${d.message}`));
        } else {
            vscode.window.setStatusBarMessage(`ForceCode: Execute Anonymous Success $(check)`);
        }
        return res;
    }
    function showResult(res) {
        'use strict';
        return configuration().then(config => {
            vscode.window.forceCode.outputChannel.clear();
            vscode.window.forceCode.outputChannel.appendLine(debugOnly(config.debugOnly));
            vscode.window.forceCode.outputChannel.show();
            return res;
        })
        function debugOnly(shouldShowOnlyDebugLines) {
            if (shouldShowOnlyDebugLines) {
                return res.header.debugLog.split('\n').filter(l => l.match(/USER_DEBUG/)).join('\n');
            } else {
                return res.header.debugLog;
            }
        }
    }

}
