import * as vscode from 'vscode';
import * as moment from 'moment';
import * as chalk from 'chalk';
import jsforce = require('jsforce');
var SoapApi = require('jsforce/lib/api');
import {IForceService} from './../forceCode';
const DEBUG_LEVEL_NAME: string = 'Execute_Anonymous_Debug';
const LOG_TYPE: string = 'DEVELOPER_LOG';
const executeAnonymousService: IExecuteAnonymousService = {};
var service: IForceService;
var outputChannel = vscode.window.createOutputChannel('ForceCode');

export interface IExecuteAnonymousService {
    userId?: string;
    queryString?: string;
    connection?: jsforce.Connection;
    apexBody?: string;
    traceFlagId?: string;
    logId?: string;
};

export default function executeAnonymous(document: vscode.TextDocument): any {
    'use strict';
    let apexBody = document.getText();
    service = vscode.window.forceCode;
        return service.connect()
        // USING SOAP API
        .then(svc => invokeExecuteAnonymous(apexBody))
        .then(res => runDiagnostics(res, document))
        .then(showResult, onError);
}
// =========================================================================================================
// =====================       USING SOAP API      =========================================================
// =========================================================================================================
function invokeExecuteAnonymous(text: string): jsforce.ExecuteAnonymousResponse {
    service.conn.debuggingHeader = service.conn.debuggingHeader ? service.conn.debuggingHeader : {};
    service.conn.debuggingHeader['@xmlns'] = 'http://soap.sforce.com/2006/08/apex';
    service.conn.debuggingHeader['categories'] = [
        {
            'category': 'Apex_code',
            'level': 'DEBUG'
        } , {
            'category': 'Apex_profiling',
            'level': 'INFO'
        } , {
            'category': 'Callout',
            'level': 'INFO'
        } , {
            'category': 'Db',
            'level': 'INFO'
        } , {
            'category': 'System',
            'level': 'INFO'
        } , {
            'category': 'Validation',
            'level': 'INFO'
        } , {
            'category': 'Visualforce',
            'level': 'INFO'
        } , {
            'category': 'Workflow',
            'level': 'INFO'
        }
    ];
    return service.conn.soap.executeAnonymous(text).then(function(res){
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
        const lineNumber: number = Number(result.line) - 2;
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
    } else {
        vscode.window.setStatusBarMessage(`ForceCode: Execute Anonymous Success $(check)`);
    }
    return res;
}
function showResult(res) {
    'use strict';
    service.outputChannel.clear();
    service.outputChannel.append(res.header.debugLog);
    service.outputChannel.show();
    return true;
}

function onError(err) {
    'use strict';
    console.log(err);
}

// =========================================================================================================
// =====================       USING REST API      =========================================================
// =========================================================================================================

// function execute(traceFlagResult: any): any {
//     'use strict';
//     executeAnonymousService.traceFlagId = traceFlagResult.id;
//     return executeAnonymousService.connection.tooling.executeAnonymous(executeAnonymousService.apexBody);
// }
