
import * as vscode from 'vscode';
import * as chalk from 'chalk';
import * as moment from 'moment';
import jsforce = require('jsforce');
import {constants} from './../services';
// var SoapApi = require('jsforce/lib/api');
import {IForceService} from './../forceCode';
const DEBUG_LEVEL_NAME: string = 'FORCE_CODE';
const LOG_TYPE: string = 'DEVELOPER_LOG';
var service: IForceService = undefined;
var outputChannel: vscode.OutputChannel;

// const logger: any = {
//     createDebugLevel: createDebugLevel,
//     enableLogging: enableLogging,
// };
export default class Logger {
    constructor(context) {
        service = <IForceService>context.workspaceState.get(constants.FORCE_SERVICE);
        outputChannel = <vscode.OutputChannel>context.workspaceState.get(constants.OUTPUT_CHANNEL);
    }
    // =========================================================================================================
    // =====================       USING REST API      =========================================================
    // =========================================================================================================
    createDebugLevel(debugLevel: jsforce.DebugLevel): Thenable<string> {
        const options: jsforce.DebugLevel = debugLevel || {
            ApexCode: 'DEBUG',
            ApexProfiling: 'DEBUG',
            Callout: 'DEBUG',
            Database: 'DEBUG',
            DeveloperName: DEBUG_LEVEL_NAME,
            MasterLabel: DEBUG_LEVEL_NAME,
            System: 'DEBUG',
            Validation: 'DEBUG',
            Visualforce: 'DEBUG',
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
    enableLogging(debugLevelId: string): any {
        'use strict';
        const expirationDate: string = moment().add(6, 'hours').format();
        // const startDate: string = moment().format();
        const options: jsforce.TraceFlagOptions = {
            DebugLevelId: debugLevelId,
            ExpirationDate: expirationDate,
            LogType: LOG_TYPE,
            TracedEntityId: service.userInfo.id,
        };

        const query: string = `Select Id from traceFlag where TracedEntityId = '${service.userInfo.id}'`;
        return service.conn.tooling.query(query).then(res => {
            if (res.records.length > 0) {
                // Trace Flag already exists
                this.cleanupLogging(res.records[0].Id);
                return 'true';
            } else {
                return service.conn.tooling.sobject('debugLevel').create(options).then(record => {
                    return record.id;
                });
            }
        });
        // return service.conn.tooling.sobject('traceFlag').upsert(options);
    }

    getLastLog(result: any): any {
        'use strict';
        var queryString: string = `SELECT Id FROM ApexLog WHERE Request = 'API' AND Location = 'SystemLog'`
            + ` AND Operation like '%executeAnonymous%'`
            + ` AND LogUserId='${service.userInfo.id}' ORDER BY StartTime DESC, Id DESC LIMIT 1`;

        return service.conn.query(queryString)
            .then(function (queryResult: any) {
                var id: string = queryResult.records[0].Id;
                return id;
            });
    }


    getLog(logId: string): any {
        'use strict';
        var url: string = `${service.conn._baseUrl()}/sobjects/ApexLog/${logId}/Body`;
        return new Promise((resolve, reject) => {
            vscode.window.forceCode.conn.request(url, function (err, res) {
                resolve(res);
            });
        });
    }

    truncateLog(logBody: string) {
        'use strict';
        var regex: any = /\|USER_DEBUG\|/g;
        var debug: string = logBody
            .split('\n')
            .filter(line => !!line.match(regex))
            .map(line => line.split('\|DEBUG\|')[1])
            .join('\n');
        return chalk.red(debug);
    }

    showLog(logBody) {
        'use strict';
        service.clearLog();
        outputChannel.show(3);
        outputChannel.append(logBody);
        return true;
    }

    cleanupLogging(id) {
        'use strict';
        return service.conn.tooling.sobject('traceFlag').del(id);
    }

    onError(err) {
        'use strict';
        console.log(err);
    }
}




// function getLogId(result: any): any {
//     'use strict';
//     var message: string = '';
//     if (!result.compiled) {
//         message = 'Compile Problem: ' + result.compileProblem;
//         vscode.window.showErrorMessage(message);
//         return Promise.reject(message);
//     } else if (!result.success) {
//         message = 'Exception: ' + result.exceptionMessage;
//         vscode.window.showErrorMessage(message);
//         return Promise.reject(message);
//     } else {
//         var statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
//         statusBarItem.text = 'Hello';
//         statusBarItem.tooltip = 'Hello';
//         statusBarItem.color = 'Red';
//         // vscode.window.showInformationMessage('Execute Anonymous Success', 'Foo', 'Bar').then(response => setTimeout( () => {console.log(response)}, 5000));
//         // setTimeout(function() {
//         // }, 5000);
//         executeAnonymousService.queryString = `SELECT Id FROM ApexLog WHERE Request = 'API' AND Location = 'SystemLog'`
//             + ` AND Operation like '%executeAnonymous%'`
//             + ` AND LogUserId='${executeAnonymousService.userId}' ORDER BY StartTime DESC, Id DESC LIMIT 1`;
//         return executeAnonymousService.connection.query(executeAnonymousService.queryString)
//             .then(function(queryResult: any) {
//                 var id: string = queryResult.records[0].Id;
//                 return id;
//             });
//     }
// }
