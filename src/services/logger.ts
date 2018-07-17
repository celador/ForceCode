
import * as vscode from 'vscode';
import * as chalk from 'chalk';
import * as moment from 'moment';
import jsforce = require('jsforce');
const DEBUG_LEVEL_NAME: string = 'FORCE_CODE';
const LOG_TYPE: string = 'DEVELOPER_LOG';

export default class Logger {
    public context: vscode.ExtensionContext;
    constructor(context) {
        this.context = context;
    }
    // =========================================================================================================
    // =====================       USING REST API      =========================================================
    // =========================================================================================================
    createDebugLevel(debugLevel): Promise<string> {
        const options = debugLevel || {
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
        return vscode.window.forceCode.conn.tooling.query(query).then(res => {
            if (res.records.length > 0) {
                return res.records[0]['Id'];
            } else {
                return vscode.window.forceCode.conn.tooling.sobject('debugLevel').create(options).then(record => {
                    return record['id'];
                });
            }
        });
    }
    enableLogging(debugLevelId: string): any {
        const expirationDate: string = moment().add(6, 'hours').format();
        const options = {
            DebugLevelId: debugLevelId,
            ExpirationDate: expirationDate,
            LogType: LOG_TYPE,
            TracedEntityId: vscode.window.forceCode.userInfo.id,
        };

        const query: string = `Select Id from traceFlag where TracedEntityId = '${vscode.window.forceCode.userInfo.id}'`;
        return vscode.window.forceCode.conn.tooling.query(query).then(res => {
            if (res.records.length > 0) {
                // Trace Flag already exists
                this.cleanupLogging(res.records[0]['Id']);
                return 'true';
            } else {
                return vscode.window.forceCode.conn.tooling.sobject('debugLevel').create(options).then(record => {
                    return record['id'];
                });
            }
        });
    }

    getLastLog(result: any): any {
        var queryString: string = `SELECT Id FROM ApexLog WHERE Request = 'API' AND Location = 'SystemLog'`
            + ` AND Operation like '%executeAnonymous%'`
            + ` AND LogUserId='${vscode.window.forceCode.userInfo.id}' ORDER BY StartTime DESC, Id DESC LIMIT 1`;

        return vscode.window.forceCode.conn.query(queryString)
            .then(function (queryResult: any) {
                var id: string = queryResult.records[0].Id;
                return id;
            });
    }


    getLog(logId: string): any {
        var url: string = `${vscode.window.forceCode.conn.instanceUrl}/sobjects/ApexLog/${logId}/Body`;
        return new Promise((resolve, reject) => {
            vscode.window.forceCode.conn.request(url, function (err, res) {
                resolve(res);
            });
        });
    }

    truncateLog(logBody: string) {
        var regex: any = /\|USER_DEBUG\|/g;
        var debug: string = logBody
            .split('\n')
            .filter(line => !!line.match(regex))
            .map(line => line.split('\|DEBUG\|')[1])
            .join('\n');
        return chalk.red(debug);
    }

    showLog(logBody) {
        vscode.window.forceCode.clearLog();
        vscode.window.forceCode.outputChannel.appendLine(logBody);
        return true;
    }

    cleanupLogging(id) {
        return vscode.window.forceCode.conn.tooling.sobject('traceFlag').del(id);
    }

    onError(err) {
        console.error(err);
    }
}
