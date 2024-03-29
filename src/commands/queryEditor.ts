import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { outputToString, outputToCSV } from '../parsers';
import { RecordResult } from 'jsforce';
import { ForcecodeCommand } from '.';
import { getVSCodeSetting } from '../services';
import { getSrcDir, VSCODE_SETTINGS } from '../services/configuration';

export class QueryEditor extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.queryEditor';
    this.name = 'Opening Query Editor';
    this.hidden = false;
    this.description = 'Run a SOQL/TOQL query';
    this.detail = 'The SOQL/TOQL query results will be shown in the window with the option to save';
    this.icon = 'telescope';
    this.label = 'SOQL/TOQL Query';
  }

  public command(): any {
    const myExt = vscode.extensions.getExtension('JohnAaronNelson.forcecode');
    if (!myExt || !vscode.window.forceCode.config.username) {
      return Promise.reject();
    }
    const QUERYEDITOR_FILE: string = path.join(myExt.extensionPath, 'pages', 'queryEditor.html');
    const panel = vscode.window.createWebviewPanel(
      'fcQueryEditor',
      'ForceCode Query Editor',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    const qHistPath: string = path.join(
      vscode.window.forceCode.workspaceRoot,
      '.forceCode',
      vscode.window.forceCode.config.username,
      'queryHistory.json'
    );

    let curResults: any;
    let queryHistory: string[] = [];
    let curQuery: string;

    // try and get the query history
    if (fs.existsSync(qHistPath)) {
      queryHistory = fs.readJsonSync(qHistPath).queries;
    }

    // And set its HTML content
    panel.webview.html = getQueryEditorPage();

    // handle a query
    panel.webview.onDidReceiveMessage((message) => {
      // the structure of message is { toql: string, query: string }
      // or { save: boolean }
      if (message.query) {
        curQuery = message.query;
      }
      if (message.save && curResults) {
        // save the results
        const csv: boolean = getVSCodeSetting(VSCODE_SETTINGS.outputQueriesAsCSV);
        let data: string = csv ? outputToCSV(curResults) : outputToString(curResults);
        const defaultURI: vscode.Uri = vscode.Uri.file(getSrcDir());
        vscode.window
          .showSaveDialog({
            filters: csv ? { CSV: ['csv'] } : { JSON: ['json'] },
            defaultUri: defaultURI,
          })
          .then((uri) => {
            if (uri) {
              fs.outputFileSync(uri.fsPath, data);
            }
          });
      } else if (message.toql) {
        vscode.window.forceCode.conn.tooling.query(curQuery).then(sendResults).catch(onError);
      } else if (message.getResults) {
        sendResults(curResults, true);
      } else if (message.update) {
        // push the update to the server here
        // get the type from the query
        let toUpdateArray: [] = message.rows.map((row: any) => {
          return row.value;
        });
        const lowerCaseQuery: string = curQuery.toLowerCase();
        const fromIndex: number = lowerCaseQuery.indexOf(' from ');
        const typeStart: string = curQuery.substring(fromIndex + 6, curQuery.length).trimLeft();
        const type: string = typeStart.split(' ')[0];
        // save the records using the bulk api
        //vscode.window.forceCode.conn.bulk.load(type, 'update', message.rows).then(res => {
        let prom: Promise<Array<RecordResult>>;
        if (message.updateToql) {
          prom = vscode.window.forceCode.conn.tooling.sobject(type).update(toUpdateArray);
        } else {
          prom = vscode.window.forceCode.conn.sobject(type).update(toUpdateArray);
        }
        prom
          .then((res) => {
            // take the res and show message based off of it
            // clear out the bg color
            let resToSend = {
              saveResult: true,
              saveSuccess: res[0].success,
              errors: res[0].errors,
            };
            sendData(resToSend);
            // update the curResults array
            message.rows.forEach((curRow: any) => {
              Object.assign(curResults[curRow.key - 1], curRow.value);
            });
          })
          .catch((err) => {
            let resToSend = {
              saveResult: true,
              saveSuccess: false,
              errors: [err.message || err],
            };
            sendData(resToSend);
          });
      } else {
        vscode.window.forceCode.conn.query(curQuery).then(sendResults).catch(onError);
      }
    }, undefined);

    return sendQueryHistory();

    function sendResults(results: any, records?: boolean) {
      if (!records) {
        curResults = results.records;
      }
      const queryIndex: number = queryHistory.indexOf(curQuery);
      if (queryIndex !== -1) {
        queryHistory.splice(queryIndex, 1);
      }
      queryHistory.unshift(curQuery);
      const maxQueryHistory = getVSCodeSetting(VSCODE_SETTINGS.maxQueryHistory);
      if (queryHistory.length > maxQueryHistory) {
        const toDrop = queryHistory.length - maxQueryHistory;
        queryHistory.splice(maxQueryHistory, toDrop);
      }
      // save the query history
      fs.outputFileSync(qHistPath, JSON.stringify({ queries: queryHistory }, undefined, 4));
      let resToSend: {};
      if (results.length > 0 || results.totalSize > 0) {
        resToSend = {
          success: true,
          results: outputToCSV(curResults),
          limit: getVSCodeSetting(VSCODE_SETTINGS.maxQueryResultsPerPage),
        };
      } else {
        resToSend = {
          success: false,
          results: 'The query you entered returned no results',
        };
      }
      sendData(resToSend);
      sendQueryHistory();
    }

    function onError(err: any) {
      let errToSend: {} = {
        success: false,
        results: err?.message || err,
      };
      sendData(errToSend);
    }

    function sendData(data: any) {
      panel.webview.postMessage(data);
    }

    function getQueryEditorPage(): string {
      return fs.readFileSync(QUERYEDITOR_FILE).toString();
    }

    function sendQueryHistory(): Promise<any> {
      return Promise.resolve(sendData({ qHistory: queryHistory }));
    }
  }
}
