import * as vscode from 'vscode';
import * as moment from 'moment';
import * as chalk from 'chalk';

export interface IExecuteAnonymousService {
    userId?: string;
    queryString?: string;
    connection?: {
        login(name:string, password:string);
        tooling: any;
        request: any;
        query: any;
    };
    apexBody?: string;
    outputChannel?: vscode.OutputChannel;
    traceFlagId?: string;
    logId?: string;
};

const service: IExecuteAnonymousService = {};

export default function executeAnonymous(connection) {
    'use strict';
    service.connection = connection;
    service.apexBody = vscode.window.activeTextEditor.document.getText();

    // Create the output channel that we will pipe our results to.
    service.outputChannel = vscode.window.createOutputChannel('Execute Anonymous');

    // Login, then get Identity info, then enable logging, then execute the query, then get the debug log, then disable logging
    return service.connection.login('john.aaron.nelson@gmail.com', 'Science3')
        .then(enableLogging)
        .then(execute, disableLogging)
        .then(getLogId, disableLogging)
        .then(getLog)
        .then(truncateLog)
        .then(showLog)
        .then(disableLogging);
}


function enableLogging(userInfo) {
    'use strict';
    console.log('userInfo', userInfo);
    service.userId = userInfo.id;
    var expirationDate: string = moment().add(1, 'days').format('YYYY-MM-DD');

    return service.connection.tooling.sobject('traceFlag').create({
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

function execute(traceFlagResult) {
    'use strict';
    service.traceFlagId = traceFlagResult.id;
    return service.connection.tooling.executeAnonymous(service.apexBody);
}

function getLogId(result) {
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
        service.queryString = `SELECT Id FROM ApexLog WHERE Request = 'API' AND Location = 'SystemLog'`
            + ` AND Operation like '%executeAnonymous%'`
            + ` AND LogUserId='${service.userId}' ORDER BY StartTime DESC, Id DESC LIMIT 1`;
        return service.connection.query(service.queryString)
            .then(queryResult => queryResult.records[0].Id);
    }
}

function getLog(logId) {
    'use strict';
    service.logId = logId;
    var url: string = `https://johnaaronnelson-dev-ed.my.salesforce.com/services/data/v34.0/sobjects/ApexLog/${service.logId}/Body`;
    return new Promise((resolve, reject) => {
        service.connection.request(url, function(err, res) {
            resolve(res);
        });
    });
}

function truncateLog(logBody: string) {
    'use strict';
    var regex = /\|USER_DEBUG\|/g;
    var debug = logBody
                .split('\n')
                .filter(line => !!line.match(regex))
                .map(line => line.split('\|DEBUG\|')[1])
                .join('\n');
    return chalk.red(debug);
}

function showLog(logBody) {
    'use strict';
    service.outputChannel.clear();
    service.outputChannel.show(3);
    service.outputChannel.append(logBody);
}

function disableLogging() {
    'use strict';
    return service.connection.tooling.sobject('traceFlag').del(service.traceFlagId);
}
