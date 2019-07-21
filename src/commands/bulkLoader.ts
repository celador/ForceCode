import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { dxService, SObjectCategory } from '../services';
import { ForcecodeCommand } from './forcecodeCommand';

export class BulkLoader extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.bulkLoader';
    this.name = 'Opening Bulk Loader';
    this.hidden = false;
    this.description = 'Perform bulk CRUD operations';
    this.detail = 'Insert, update, or delete records in bulk by uploading a CSV file.';
    this.icon = 'file';
    this.label = 'Bulk Loader';
  }

  public command(context: any, selectedResource: any): any {
    const myExt = vscode.extensions.getExtension('JohnAaronNelson.forcecode');
    if (!myExt) {
      return Promise.reject('Error loading extension info');
    }
    const BULK_PAGE: string = path.join(myExt.extensionPath, 'pages', 'bulkLoader.html');
    const panel = vscode.window.createWebviewPanel(
      'fcBulk',
      'ForceCode Bulk Loader',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    // And set its HTML content
    panel.webview.html = getSettingsPage();
    var csvPath: string;
    var batch: any;
    var timeOut: NodeJS.Timeout;
    var totalRecords: number;
    const defaultURI: vscode.Uri = vscode.Uri.file(vscode.window.forceCode.projectRoot);

    // handle settings changes
    panel.webview.onDidReceiveMessage(message => {
      if (message.uploadCSV) {
        vscode.window
          .showOpenDialog({
            filters: { CSV: ['csv'] },
            defaultUri: defaultURI,
            canSelectFolders: false,
            canSelectMany: false,
          })
          .then(uri => {
            if (uri) {
              csvPath = uri[0].fsPath;
              try {
                totalRecords =
                  fs
                    .readFileSync(csvPath)
                    .toString()
                    .split('\n').length - 1;
                panel.webview.postMessage({ fileSelected: true, totalRecords: totalRecords });
              } catch (e) {
                throw 'Invalid file format, please select a CSV file';
              }
            }
          });
      } else {
        var csvFileIn = fs.createReadStream(csvPath);
        vscode.window.forceCode.conn.bulk.pollInterval = vscode.workspace.getConfiguration('force')[
          'bulkLoaderPollInterval'
        ];
        vscode.window.forceCode.conn.bulk.pollTimeout = vscode.workspace.getConfiguration('force')[
          'bulkLoaderPollTimeout'
        ];
        batch = vscode.window.forceCode.conn.bulk.load(
          message.object,
          message.operation,
          csvFileIn,
          (err, rets) => {
            if (timeOut) {
              clearTimeout(timeOut);
            }
            if (err) {
              panel.webview.postMessage({ error: err.message ? err.message : err });
              return;
            }
            var totalErrors: number = 0;
            var errorFile: string = '"Line Number In CSV File","ERROR"\n';
            for (var i = 0; i < rets.length; i++) {
              if (!rets[i].success) {
                totalErrors++;
                errorFile += '"' + (i + 2) + '","' + rets[i].errors[0] + '"\n';
              }
            }
            if (totalErrors > 0) {
              vscode.window
                .showSaveDialog({
                  filters: { CSV: ['csv'] },
                  defaultUri: defaultURI,
                  saveLabel: 'Save Error File',
                })
                .then(uri => {
                  if (uri) {
                    fs.outputFileSync(uri.fsPath, errorFile);
                  }
                });
            }
            panel.webview.postMessage({
              state: 'Completed',
              processed: totalRecords,
              failures: String(totalErrors),
            });
          }
        );
        csvPath = '';
        panel.webview.postMessage({ uploading: true });
        checkStatus();
      }
    }, undefined);

    return dxService.describeGlobal(SObjectCategory.ALL).then(sObjects => {
      return panel.webview.postMessage({ sObjects: sObjects });
    });

    function getSettingsPage(): string {
      return fs.readFileSync(BULK_PAGE).toString();
    }

    function checkStatus() {
      if (timeOut) {
        clearTimeout(timeOut);
      }
      timeOut = setTimeout(() => {
        try {
          batch.check().then((res: any) => {
            panel.webview.postMessage({
              state: res.state,
              processed: res.numberRecordsProcessed,
              failures: res.numberRecordsFailed,
            });
            if (res.status !== 'Completed') {
              checkStatus();
            }
          });
        } catch (e) {}
      }, vscode.workspace.getConfiguration('force')['bulkLoaderPollInterval']);
    }
  }
}
