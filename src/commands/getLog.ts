import * as vscode from 'vscode';
import { fcConnection, dxService } from '../services';
import { QueryResult } from 'jsforce';
import { ForcecodeCommand } from '.';

interface LogRecord {
  Id: string;
  LogLength: string;
  Request: string;
  Status: string;
  DurationMilliseconds: string;
  StartTime: string;
  Location: string;
}

export class GetLog extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.getLogs';
    this.name = 'Retrieving logs';
    this.hidden = false;
    this.description = 'Display a list of the last ten logs.';
    this.detail = 'Get recent logs';
    this.icon = 'unfold';
    this.label = 'Get Logs';
  }

  public command(): any {
    // Login, then get Identity info,
    //  then get info about the logs and ask the user which one to open,
    //  then get the log and show it
    return getLast10Logs()
      .then(displayOptions)
      .then(showLog);

    function getLast10Logs(): Promise<QueryResult> {
      if (!fcConnection.currentConnection) {
        return Promise.reject('No org info found');
      }
      let queryString: string =
        `SELECT Id, LogLength, Request, Status, DurationMilliseconds, StartTime, Location FROM ApexLog` +
        ` WHERE LogUserId='${fcConnection.currentConnection.orgInfo.userId}'` +
        // ` AND Request = 'API' AND Location = 'SystemLog'` +
        // ` AND Operation like '%executeAnonymous%'`
        ` ORDER BY StartTime DESC, Id DESC LIMIT 10`;

      return vscode.window.forceCode.conn.tooling.query(queryString);
    }

    function displayOptions(results: QueryResult): Thenable<vscode.QuickPickItem | undefined> {
      let options: vscode.QuickPickItem[] = results.records.map((record: LogRecord) => {
        return {
          label: `Status: ${record.Status}`,
          detail: `Start: ${new Date(record.StartTime).toLocaleString()}, Bytes: ${
            record.LogLength
          }`,
          description: record.Id,
        };
      });
      return vscode.window.showQuickPick(options);
    }

    function showLog(res: any) {
      if (res) {
        return dxService.getAndShowLog(res.description);
      }
      return res;
    }
  }
}
