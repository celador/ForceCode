import * as vscode from 'vscode';
import { QueryResult } from '../services/dxService';
import { fcConnection, dxService } from '../services';

interface LogRecord {
  Id: string;
  LogLength: string;
  Request: string;
  Status: string;
  DurationMilliseconds: string;
  StartTime: string;
  Location: string;
}

export default function getLog() {
  // Login, then get Identity info,
  //  then get info about the logs and ask the user which one to open,
  //  then get the log and show it
  return getLast10Logs()
    .then(displayOptions)
    .then(showLog);

  function getLast10Logs(): Promise<QueryResult> {
    var queryString: string =
      `SELECT Id, LogLength, Request, Status, DurationMilliseconds, StartTime, Location FROM ApexLog` +
      ` WHERE LogUserId='${fcConnection.currentConnection.orgInfo.userId}'` +
      // ` AND Request = 'API' AND Location = 'SystemLog'` +
      // ` AND Operation like '%executeAnonymous%'`
      ` ORDER BY StartTime DESC, Id DESC LIMIT 10`;

    return vscode.window.forceCode.conn.tooling.query(queryString);
  }

  function displayOptions(results: QueryResult): Thenable<vscode.QuickPickItem> {
    var options: vscode.QuickPickItem[] = results.records.map((record: LogRecord) => {
      return {
        label: `Status: ${record.Status}`,
        detail: `Start: ${new Date(record.StartTime).toLocaleString()}, Bytes: ${record.LogLength}`,
        description: record.Id,
      };
    });
    return vscode.window.showQuickPick(options);
  }

  function showLog(res) {
    if (res) {
      return dxService.getAndShowLog(res.description);
    }
    return res;
  }
}
