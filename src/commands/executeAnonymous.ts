import * as vscode from 'vscode';
import * as moment from 'moment';
import * as chalk from 'chalk';
import jsforce = require('jsforce');
var SoapApi = require('jsforce/lib/api');
import {IForceService} from './../services';
const DEBUG_LEVEL_NAME: string = 'Execute_Anonymous_Debug';
const LOG_TYPE: string = 'DEVELOPER_LOG';
const executeAnonymousService: IExecuteAnonymousService = {};
var service: IForceService = undefined;
var outputChannel = vscode.window.createOutputChannel('ForceCode');

export interface IExecuteAnonymousService {
    userId?: string;
    queryString?: string;
    connection?: jsforce.Connection;
    apexBody?: string;
    traceFlagId?: string;
    logId?: string;
};

export default function executeAnonymous(force: IForceService, document: vscode.TextDocument): any {
    'use strict';
    executeAnonymousService.apexBody = document.getText();
    // Create the output channel that we will pipe our results to.

    // Login, then get Identity info, then enable logging, then execute the query, then get the debug log, then disable logging
    return force.connect()
        .then(setConnection)
        // USING SOAP API
        .then(svc => invokeExecuteAnonymous(svc, executeAnonymousService.apexBody))
        .then(res => runDiagnostics(res, document))
        .then(showResult)
        .then(cleanupLogging, onError);
    // // PREVIOUS VERSION USING REST API
    // .then(createDebugLevel)
    // .then(enableLogging)
    // .then(execute)
    // .then(getLogId)
    // .then(setLogId)
    // .then(getLog)
    // .then(truncateLog)
    // .then(showLog)
    // .then(cleanupLogging, onError);
}
function setConnection(svc: IForceService): IForceService {
    'use strict';
    executeAnonymousService.connection = svc.conn;
    return svc;
}
// =========================================================================================================
// =====================       USING SOAP API      =========================================================
// =========================================================================================================
function invokeExecuteAnonymous(svc: IForceService, text: string): jsforce.ExecuteAnonymousResponse {
    svc.conn.debuggingHeader = svc.conn.debuggingHeader ? svc.conn.debuggingHeader : {};
    svc.conn.debuggingHeader['@xmlns'] = 'http://soap.sforce.com/2006/08/apex';
    svc.conn.debuggingHeader['categories'] = [
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
    return svc.conn.soap.executeAnonymous(text).then(function(res){
        return res;
    });
}
function runDiagnostics(res: jsforce.ExecuteAnonymousResponse, document: vscode.TextDocument) {
    // Create a diagnostic Collection for the current file.  Overwriting the last...
    var diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(document.fileName);
    var diagnostics: vscode.Diagnostic[] = [];
    var result: any = res.body.result;
    var header: any = res.header;
    if (result.compiled === "false") {
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
        vscode.window.setStatusBarMessage(`ForceCode: Execute Anonymous Errors!`);
    } else {
        vscode.window.setStatusBarMessage(`ForceCode: Execute Anonymous Success!`);
    }
    return res;
}
function showResult(res) {
    'use strict';
    // var outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('Execute Anonymous');
    // outputChannel.clear();
    // outputChannel.show(3);
    outputChannel.append(res.header.debugLog);
    return true;
}

// function invokeExecuteCode(instanceUrl, sessionId, loggingLevels, code, callback) {
//     var data = '<?xml version="1.0" encoding="UTF-8"?>'
//         + '<env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
//         + '<env:Header>'

//     if (loggingLevels.length > 0) {
//         data += '<DebuggingHeader xmlns="http://soap.sforce.com/2006/08/apex">';

//         for (var i = 0; i < loggingLevels.length; i++) {
//             data += '<categories>'
//                 + '<category>' + loggingLevels[i].category + '</category>'
//                 + '<level>' + loggingLevels[i].level + '</level>'
//                 + '</categories>'
//         }

//         data += '</DebuggingHeader>';
//     }

//     data += '<SessionHeader xmlns="http://soap.sforce.com/2006/08/apex">'
//         + '<sessionId>' + sessionId + '</sessionId>'
//         + '</SessionHeader>'
//         + '</env:Header>'
//         + '<env:Body>'
//         + '<executeAnonymous xmlns="http://soap.sforce.com/2006/08/apex">'
//         + '<String>' + escapeXml(code) + '</String>'
//         + '</executeAnonymous>'
//         + '</env:Body>'
//         + '</env:Envelope>';

//     var url = instanceUrl + '/services/Soap/s/' + version;

//     $.ajax({
//         type: 'POST',
//         url: url,
//         headers: {
//             'Content-Type': 'text/xml',
//             'SOAPAction': '""'
//         },
//         data: data,
//         dataType: 'xml',
//         success: function(xml) {
//             var response = {};
//             response.type = 'executeCode';
//             response.data = {};
//             response.data.truncated = false;

//             var content = $(xml).find('debugLog').text();
//             if (content.length == 0) {
//                 response.data.compiled = false;
//                 response.data.errorLine = $(xml).find('line').text();
//                 response.data.errorColumn = $(xml).find('column').text();
//                 response.data.errorMessage = $(xml).find('compileProblem').text();
//             } else {
//                 response.data.compiled = true;
//                 response.data.instanceUrl = instanceUrl;
//                 response.data.content = content;
//                 response.data.truncated = (content.indexOf('*********** MAXIMUM DEBUG LOG SIZE REACHED ***********') != -1);
//             }

//             callback(response);
//         },
//         error: function(jqXHR) {
//             var xml = $.parseXML(jqXHR.responseText);

//             var response = {};
//             response.type = 'executeCode';
//             response.data = {};
//             response.data.truncated = false;
//             response.data.compiled = false;
//             response.data.errorMessage = $(xml).find('faultstring').text();

//             callback(response);
//         }
//     });
// }

// =========================================================================================================
// =====================       USING REST API      =========================================================
// =========================================================================================================
function createDebugLevel(svc: IForceService): Thenable<string> {
    const options: jsforce.DebugLevel = {
        ApexCode: 'DEBUG',
        ApexProfiling: 'NONE',
        Callout: 'NONE',
        Database: 'NONE',
        DeveloperName: DEBUG_LEVEL_NAME,
        MasterLabel: DEBUG_LEVEL_NAME,
        System: 'DEBUG',
        Validation: 'DEBUG',
        Visualforce: 'NONE',
        Workflow: 'DEBUG',
    };
    const query: string = `Select Id, DeveloperName from debugLevel where DeveloperName = '${DEBUG_LEVEL_NAME}'`;
    return service.conn.tooling.query(query).then(res => {
        if (res.records.length > 0) {
            return res.records[0].Id;
        } else {
            return service.conn.tooling.sobject('debugLevel').create(options).then(record => {
                return record.id;
            });
        }
    });
}
function enableLogging(id: string): any {
    'use strict';
    const expirationDate: string = moment().add(6, 'hours').format();
    // const startDate: string = moment().format();
    const options: jsforce.TraceFlagOptions = {
        DebugLevelId: id,
        ExpirationDate: expirationDate,
        LogType: LOG_TYPE,
        TracedEntityId: service.userInfo.id,
    };

    const query: string = `Select Id from traceFlag where TracedEntityId = '${service.userInfo.id}'`;
    return service.conn.tooling.query(query).then(res => {
        if (res.records.length > 0) {
            // Trace Flag already exists
            return this.cleanupLogging(res.records[0].Id);
        } else {
            return service.conn.tooling.sobject('debugLevel').create(options).then(record => {
                return record.id;
            });
        }
    }).then(traceFlagId => {
        executeAnonymousService.traceFlagId = traceFlagId;
        return true;
    });
    // return service.conn.tooling.sobject('traceFlag').upsert(options);
}


function execute(traceFlagResult: any): any {
    'use strict';
    executeAnonymousService.traceFlagId = traceFlagResult.id;
    return executeAnonymousService.connection.tooling.executeAnonymous(executeAnonymousService.apexBody);
}

function getLogId(result: any): any {
    'use strict';
    var message: string = '';
    if (!result.compiled) {
        message = 'Compile Problem: ' + result.compileProblem;
        vscode.window.showErrorMessage(message);
        return Promise.reject(message);
    } else if (!result.success) {
        message = 'Exception: ' + result.exceptionMessage;
        vscode.window.showErrorMessage(message);
        return Promise.reject(message);
    } else {
        var statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
        statusBarItem.text = 'Hello';
        statusBarItem.tooltip = 'Hello';
        statusBarItem.color = 'Red';
        // vscode.window.showInformationMessage('Execute Anonymous Success', 'Foo', 'Bar').then(response => setTimeout( () => {console.log(response)}, 5000));
        // setTimeout(function() {
        // }, 5000);
        executeAnonymousService.queryString = `SELECT Id FROM ApexLog WHERE Request = 'API' AND Location = 'SystemLog'`
            + ` AND Operation like '%executeAnonymous%'`
            + ` AND LogUserId='${executeAnonymousService.userId}' ORDER BY StartTime DESC, Id DESC LIMIT 1`;
        return executeAnonymousService.connection.query(executeAnonymousService.queryString)
            .then(function(queryResult: any) {
                var id: string = queryResult.records[0].Id;
                return id;
            });
    }
}

function setLogId(logId: string): any {
    'use strict';
    executeAnonymousService.logId = logId;
    return executeAnonymousService.logId;
}

function getLog(logId: string): any {
    'use strict';
    var url: string = `${executeAnonymousService.connection._baseUrl()}/sobjects/ApexLog/${logId}/Body`;
    return new Promise((resolve, reject) => {
        executeAnonymousService.connection.request(url, function(err, res) {
            resolve(res);
        });
    });
}

function truncateLog(logBody: string) {
    'use strict';
    var regex: any = /\|USER_DEBUG\|/g;
    var debug: string = logBody
        .split('\n')
        .filter(line => !!line.match(regex))
        .map(line => line.split('\|DEBUG\|')[1])
        .join('\n');
    return chalk.red(debug);
}

function showLog(logBody) {
    'use strict';
    var outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('Execute Anonymous');
    outputChannel.clear();
    outputChannel.show(3);
    outputChannel.append(logBody);
    return true;
}

function cleanupLogging(id) {
    'use strict';
    return executeAnonymousService.connection.tooling.sobject('traceFlag').del(id);
}

function onError(err) {
    'use strict';
    console.log(err);
}
