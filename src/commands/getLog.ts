import * as vscode from 'vscode';
import jsforce = require('jsforce');
import { IForceService } from './../forceCode';
import * as error from './../util/error';
import { Connection, QueryResult } from 'jsforce';
const moment: any = require('moment');

interface LogRecord {
    Id: string;
    LogLength: string;
    Request: string;
    Status: string;
    DurationMilliseconds: string;
    StartTime: string;
    Location: string;
}
export interface IGetLogService {
    userId?: string;
    connection?: Connection;
    logId?: string;
};
const getLogService: IGetLogService = {};

export default function getLog(context: vscode.ExtensionContext) {
    // Login, then get Identity info, 
    //  then get info about the logs and ask the user which one to open, 
    //  then get the log and show it
    return vscode.window.forceCode.connect(context)
        .then(setConnection)
        .then(getLast10Logs)
        .then(displayOptions)
        .then(showLog)
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));

    function setConnection(connection: IForceService): IForceService {
        getLogService.connection = connection.conn;
        getLogService.userId = connection.userInfo.id;
        return connection;
    }

    function getLast10Logs(force: IForceService): Promise<QueryResult<any>> {

        var queryString: string = `SELECT Id, LogLength, Request, Status, DurationMilliseconds, StartTime, Location FROM ApexLog` +
            ` WHERE LogUserId='${getLogService.userId}'` +
            // ` AND Request = 'API' AND Location = 'SystemLog'` +
            // ` AND Operation like '%executeAnonymous%'`
            ` ORDER BY StartTime DESC, Id DESC LIMIT 10`;

        return force.conn.query(queryString);
    }

    function displayOptions(results: QueryResult<any>): Thenable<vscode.QuickPickItem> {
        var options: vscode.QuickPickItem[] = results.records.map((record: LogRecord) => {
            return {
                label: `Status: ${record.Status}`,
                detail: `Start: ${moment(record.StartTime).format('dddd, MMMM Do YYYY, h:mm:ss a')}, Bytes: ${record.LogLength}`,
                description: record.Id,
            };
        });
        return vscode.window.showQuickPick(options);
    }

    function showLog(res) {
        if (vscode.window.forceCode.config.showTestLog) {
            return vscode.workspace.openTextDocument(vscode.Uri.parse(`sflog://salesforce.com/${res.description}.log?q=${new Date()}`)).then(function (_document: vscode.TextDocument) {
                return vscode.window.showTextDocument(_document, 3, true);
            });
        }
        return res;
    }
}


