import * as vscode from 'vscode';
import jsforce = require('jsforce');
import * as path from 'path';
import * as fs from 'fs-extra';
import { IForceService } from './../forceCode';
import * as error from './../util/error';
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
    connection?: jsforce.Connection;
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
        .then(getLogById)
        .then(showLog)
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));

    function setConnection(connection: IForceService): IForceService {
        getLogService.connection = connection.conn;
        getLogService.userId = connection.userInfo.id;
        return connection;
    }

    function getLast10Logs(force: IForceService): Promise<jsforce.QueryResult> {

        var queryString: string = `SELECT Id, LogLength, Request, Status, DurationMilliseconds, StartTime, Location FROM ApexLog` +
            ` WHERE LogUserId='${getLogService.userId}'` +
            // ` AND Request = 'API' AND Location = 'SystemLog'` +
            // ` AND Operation like '%executeAnonymous%'`
            ` ORDER BY StartTime DESC, Id DESC LIMIT 10`;

        return force.conn.query(queryString);
    }

    function displayOptions(results: jsforce.QueryResult): Thenable<vscode.QuickPickItem> {
        var options: vscode.QuickPickItem[] = results.records.map((record: LogRecord) => {
            return {
                label: `Status: ${record.Status}`,
                detail: `Start: ${moment(record.StartTime).format('dddd, MMMM Do YYYY, h:mm:ss a')}, Bytes: ${record.LogLength}`,
                description: record.Id,
            };
        });
        return vscode.window.showQuickPick(options);
    }

    function getLogById(result: vscode.QuickPickItem): Promise<string> {
        getLogService.logId = result.description;
        var url: string = `${getLogService.connection._baseUrl()}/sobjects/ApexLog/${getLogService.logId}/Body`;
        return getLogService.connection.request(url);
    }

    function showLog(logBody) {
        var tempPath: string = `${vscode.workspace.rootPath}${path.sep}.logs${path.sep}${getLogService.logId}.log`;
        fs.stat(tempPath, function (err, stats) {
            if (err) {
                return open(vscode.Uri.parse(`untitled:${tempPath}`)).then(show).then(replaceAll);
            } else {
                return open(vscode.Uri.parse(`file:${tempPath}`)).then(show);
            }

            function open(uri) {
                return vscode.workspace.openTextDocument(uri);
            }
            function show(document) {
                return vscode.window.showTextDocument(document, vscode.window.visibleTextEditors.length - 1);
            }
            function replaceAll(editor) {
                var start: vscode.Position = new vscode.Position(0, 0);
                var lineCount: number = editor.document.lineCount - 1;
                var lastCharNumber: number = editor.document.lineAt(lineCount).text.length;
                var end: vscode.Position = new vscode.Position(lineCount, lastCharNumber);
                var range: vscode.Range = new vscode.Range(start, end);
                editor.edit(builder => builder.replace(range, logBody));
            }
        })
    }
}


