import * as vscode from 'vscode';
// import * as moment from 'moment';
// import * as chalk from 'chalk';
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
        .then(showResult, onError);

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
                'level': 'NONE'
            }, {
                'category': 'Callout',
                'level': 'NONE'
            }, {
                'category': 'Db',
                'level': 'NONE'
            }, {
                'category': 'System',
                'level': 'DEBUG'
            }, {
                'category': 'Validation',
                'level': 'NONE'
            }, {
                'category': 'Visualforce',
                'level': 'NONE'
            }, {
                'category': 'Workflow',
                'level': 'NONE'
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
        vscode.window.forceCode.outputChannel.clear();
        vscode.window.forceCode.outputChannel.appendLine(res.header.debugLog);
        vscode.window.forceCode.outputChannel.show();
        return true;
    }

    function onError(err) {
        'use strict';
        console.error(err);
    }

    // =========================================================================================================
    // =====================       USING REST API      =========================================================
    // =========================================================================================================

    // function execute(traceFlagResult: any): any {
    //     'use strict';
    //     executeAnonymousService.traceFlagId = traceFlagResult.id;
    //     return executeAnonymousService.connection.tooling.executeAnonymous(executeAnonymousService.apexBody);
    // }
}
