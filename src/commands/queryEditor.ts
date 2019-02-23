import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { outputToString, outputToCSV } from '../parsers/output';
import { RecordResult } from 'jsforce';

export default function queryEditor(): Promise<any> {
  const myExtDir = vscode.extensions.getExtension('JohnAaronNelson.forcecode').extensionPath;
  const QUERYEDITOR_FILE: string = path.join(myExtDir, 'pages', 'queryEditor.html');
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

  var curResults;
  var queryHistory: string[] = [];
  var curQuery: string;

  // try and get the query history
  if (fs.existsSync(qHistPath)) {
    queryHistory = fs.readJsonSync(qHistPath).queries;
  }

  // And set its HTML content
  panel.webview.html = getQueryEditorPage();

  // handle a query
  panel.webview.onDidReceiveMessage(message => {
    // the structure of message is { toql: string, query: string }
    // or { save: boolean }
    if (message.query) {
      curQuery = message.query;
    }
    if (message.save && curResults) {
      // save the results
      const csv: boolean = vscode.workspace.getConfiguration('force')['outputQueriesAsCSV'];
      var data: string = csv ? outputToCSV(curResults) : outputToString(curResults);
      const defaultURI: vscode.Uri = {
        scheme: 'file',
        path: vscode.window.forceCode.projectRoot.split('\\').join('/'),
        fsPath: vscode.window.forceCode.projectRoot,
        authority: undefined,
        query: undefined,
        fragment: undefined,
        with: undefined,
        toJSON: undefined,
      };
      vscode.window
        .showSaveDialog({
          filters: csv ? { CSV: ['csv'] } : { JSON: ['json'] },
          defaultUri: defaultURI,
        })
        .then(uri => {
          if (uri) {
            fs.outputFileSync(uri.fsPath, data);
          }
        });
    } else if (message.toql) {
      vscode.window.forceCode.conn.tooling
        .query(curQuery)
        .then(sendResults)
        .catch(onError);
    } else if (message.getResults) {
      sendResults(curResults, true);
    } else if (message.update) {
      // push the update to the server here
      // get the type from the query
      var toUpdateArray: [] = message.rows.map(row => {
        return row.value;
      });
      const lowerCaseQuery: string = curQuery.toLowerCase();
      const fromIndex: number = lowerCaseQuery.indexOf(' from ');
      const typeStart: string = curQuery.substring(fromIndex + 6, curQuery.length).trimLeft();
      const type: string = typeStart.split(' ')[0];
      // save the records using the bulk api
      //vscode.window.forceCode.conn.bulk.load(type, 'update', message.rows).then(res => {
      var prom: Promise<Array<RecordResult>>;
      if (message.updateToql) {
        prom = vscode.window.forceCode.conn.tooling.sobject(type).update(toUpdateArray);
      } else {
        prom = vscode.window.forceCode.conn.sobject(type).update(toUpdateArray);
      }
      prom
        .then(res => {
          // take the res and show message based off of it
          // clear out the bg color
          var resToSend = {
            saveResult: true,
            saveSuccess: res[0].success,
            errors: res[0].errors,
          };
          sendData(resToSend);
          // update the curResults array
          message.rows.forEach(curRow => {
            Object.assign(curResults[curRow.key - 1], curRow.value);
          });
        })
        .catch(err => {
          var resToSend = {
            saveResult: true,
            saveSuccess: false,
            errors: [err.message ? err.message : err],
          };
          sendData(resToSend);
        });
    } else {
      vscode.window.forceCode.conn
        .query(curQuery)
        .then(sendResults)
        .catch(onError);
    }
  }, undefined);

  return sendQueryHistory();

  function sendResults(results, records?: boolean) {
    if (!records) {
      curResults = results.records;
    }
    const queryIndex: number = queryHistory.indexOf(curQuery);
    if (queryIndex !== -1) {
      queryHistory.splice(queryIndex, 1);
    }
    queryHistory.unshift(curQuery);
    const maxQueryHistory = vscode.workspace.getConfiguration('force')['maxQueryHistory'];
    if (queryHistory.length > maxQueryHistory) {
      const toDrop = queryHistory.length - maxQueryHistory;
      queryHistory.splice(maxQueryHistory, toDrop);
    }
    // save the query history
    fs.outputFileSync(qHistPath, JSON.stringify({ queries: queryHistory }, undefined, 4));
    var resToSend: {};
    if (results.length > 0 || results.totalSize > 0) {
      resToSend = {
        success: true,
        results: outputToCSV(curResults),
        limit: vscode.workspace.getConfiguration('force')['maxQueryResultsPerPage'],
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

  function onError(err) {
    var errToSend: {} = {
      success: false,
      results: err && err.message ? err.message : err,
    };
    sendData(errToSend);
  }

  function sendData(data) {
    panel.webview.postMessage(data);
  }

  function getQueryEditorPage(): string {
    return fs.readFileSync(QUERYEDITOR_FILE).toString();
  }

  function sendQueryHistory(): Promise<any> {
    return Promise.resolve(sendData({ qHistory: queryHistory }));
  }
}
