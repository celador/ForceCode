import * as vscode from 'vscode';
import * as moment from 'moment';
import * as chalk from 'chalk';
import jsforce = require('jsforce');
import {IForceService} from './../services';

interface TraceFlagOptions {
    ApexCode?: string;
    ApexProfiling?: string;
    Callout?: string;
    Database?: string;
    System?: string;
    Validation?: string;
    Visualforce?: string;
    Workflow?: string;
    DebugLevelId?: string;
    ExpirationDate: string; // Datetime
    // LogType?: string; // USER_DEBUG
    // StartDate?: string; // Datetime
    TracedEntityId?: string; // UserId
}
export interface IExecuteAnonymousService {
    userId?: string;
    queryString?: string;
    connection?: jsforce.Connection;
    apexBody?: string;
    traceFlagId?: string;
    logId?: string;
};
const executeAnonymousService: IExecuteAnonymousService = {};

export default function executeAnonymous(force: IForceService, text: string): any {
    'use strict';
    executeAnonymousService.apexBody = text;
    // Create the output channel that we will pipe our results to.

    // Login, then get Identity info, then enable logging, then execute the query, then get the debug log, then disable logging
    return force.connect()
        .then(setConnection)
        .then(enableLogging)
        .then(execute)
        .then(getLogId)
        .then(setLogId)
        .then(getLog)
        .then(truncateLog)
        .then(showLog)
        .then(cleanupLogging, onError);
}
function setConnection(connection: IForceService): IForceService {
    'use strict';
    executeAnonymousService.connection = connection.conn;
    executeAnonymousService.userId = connection.userInfo.id;
    return connection;
}
function enableLogging(connection: IForceService): any {
    'use strict';
    const expirationDate: string = moment().add(6, 'hours').format();
    // const startDate: string = moment().format();
    const options: TraceFlagOptions = {
        ApexCode: 'DEBUG',
        ApexProfiling: 'ERROR',
        Callout: 'ERROR',
        Database: 'ERROR',
        ExpirationDate: expirationDate, // Datetime
        System: 'ERROR',
        TracedEntityId: executeAnonymousService.userId, // UserId
        Validation: 'ERROR',
        Visualforce: 'ERROR',
        Workflow: 'ERROR',
        // LogType: 'USER_DEBUG', // USER_DEBUG
        // StartDate: startDate, // Datetime
    };

    return connection.conn.tooling.sobject('traceFlag').create(options);
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

function cleanupLogging(err) {
    'use strict';
    return executeAnonymousService.connection.tooling.sobject('traceFlag').del(executeAnonymousService.traceFlagId);
}

function onError(err) {
    'use strict';
    console.log(err);
}
