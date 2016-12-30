import * as vscode from 'vscode';
import jsforce = require('jsforce');
import {IForceService} from './../forceCode';
import * as error from './../util/error';

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

function getLog(context: vscode.ExtensionContext) {
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
}
export default getLog;

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

function displayOptions(results: jsforce.QueryResult) {
    var options: Array<string> = results.records.map((record: LogRecord) => {
        return `${record.Id} (status:${record.Status} start:${record.StartTime} length${record.LogLength})`;
    });
    return vscode.window.showQuickPick(options);
}

function getLogById(result: string): Promise<string> {
    getLogService.logId = result.split(' (')[0];
    var url: string = `${getLogService.connection._baseUrl()}/sobjects/ApexLog/${getLogService.logId}/Body`;
    return getLogService.connection.request(url);
}

function showLog(logBody) {
    vscode.workspace.openTextDocument(vscode.Uri.parse(`untitled:${getLogService.logId}.log`)).then(document => {
        vscode.window.showTextDocument(document, vscode.window.visibleTextEditors.length - 1).then(editor => {
            var start: vscode.Position = new vscode.Position(0, 0);
            var lineCount: number = editor.document.lineCount - 1;
            var lastCharNumber: number = editor.document.lineAt(lineCount).text.length;
            var end: vscode.Position = new vscode.Position(lineCount, lastCharNumber);
            var range: vscode.Range = new vscode.Range(start, end);
            editor.edit( builder => builder.replace(range, logBody));
        });
    });
    return true;
}

// function onError(err) {
//     console.error(err);
// }

