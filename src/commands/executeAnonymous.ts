import * as vscode from 'vscode';
import * as moment from 'moment';
import * as chalk from 'chalk';
import * as force from './../forceSvc';

interface IExecuteAnonymousService {
    userId?: string;
    queryString?: string;
    connection?: force.IForceConnection;
    apexBody?: string;
    outputChannel?: vscode.OutputChannel;
    traceFlagId?: string;
    logId?: string;
};
const self: IExecuteAnonymousService = {};

export default function executeAnonymous(force: force.IForceService): any {
    'use strict';
    self.apexBody = vscode.window.activeTextEditor.document.getText();

    // Create the output channel that we will pipe our results to.
    self.outputChannel = vscode.window.createOutputChannel('Execute Anonymous');

    // Login, then get Identity info, then enable logging, then execute the query, then get the debug log, then disable logging
    return force.connect()
        .then(enableLogging)
        .then(execute, disableLogging)
        .then(getLogId, disableLogging)
        .then(getLog)
        .then(truncateLog)
        .then(showLog)
        .then(disableLogging);
}

function setConnection(userInfo: any) {
    self.connection = force.default.conn;
    return userInfo;
}


function enableLogging(userInfo: { id: string }): any {
    'use strict';
    var expirationDate: string = moment().add(1, 'days').format('YYYY-MM-DD');

    return self.connection.tooling.sobject('traceFlag').create({
        'ApexCode': 'DEBUG',
        'ApexProfiling': 'ERROR',
        'Callout': 'ERROR',
        'Database': 'ERROR',
        'ExpirationDate': expirationDate,
        'ScopeId': undefined,
        'System': 'ERROR',
        'TracedEntityId': userInfo.id,
        'Validation': 'ERROR',
        'Visualforce': 'ERROR',
        'Workflow': 'ERROR',
    });
}

function execute(traceFlagResult: any): any {
    'use strict';
    self.traceFlagId = traceFlagResult.id;
    return self.connection.tooling.executeAnonymous(self.apexBody);
}

function getLogId(result: any): any {
    'use strict';
    var message: string = '';
    if (!result.compiled) {
        message = 'Compile Problem: ' + result.compileProblem;
        vscode.window.showErrorMessage(message);
        return console.error(message);
    } else if (!result.success) {
        message = 'Exception: ' + result.exceptionMessage;
        vscode.window.showErrorMessage(message);
        return console.error();
    } else {
        vscode.window.showInformationMessage('Execute Anonymous Success');
        self.queryString = `SELECT Id FROM ApexLog WHERE Request = 'API' AND Location = 'SystemLog'`
            + ` AND Operation like '%executeAnonymous%'`
            + ` AND LogUserId='${self.userId}' ORDER BY StartTime DESC, Id DESC LIMIT 1`;
        return self.connection.query(self.queryString)
            .then((queryResult: any) => queryResult.records[0].Id);
    }
}

function getLog(logId: string): any {
    'use strict';
    self.logId = logId;
    var url: string = `https://johnaaronnelson-dev-ed.my.salesforce.com/services/data/v34.0/sobjects/ApexLog/${self.logId}/Body`;
    return new Promise((resolve, reject) => {
        self.connection.request(url, function(err, res) {
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
    self.outputChannel.clear();
    self.outputChannel.show(3);
    self.outputChannel.append(logBody);
}

function disableLogging() {
    'use strict';
    return self.connection.tooling.sobject('traceFlag').del(self.traceFlagId);
}
