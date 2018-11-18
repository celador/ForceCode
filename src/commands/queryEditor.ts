import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { outputToString, outputToCSV } from '../parsers/output';

export default function queryEditor(): Promise<any> {
    const myExtDir = vscode.extensions.getExtension("JohnAaronNelson.forcecode").extensionPath;
    const QUERYEDITOR_FILE: string = path.join(myExtDir, 'pages', 'queryEditor.html');
    const panel = vscode.window.createWebviewPanel('fcQueryEditor', "ForceCode Query Editor", vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true
    });

    const qHistPath: string = path.join(vscode.window.forceCode.workspaceRoot, '.forceCode',
        vscode.window.forceCode.config.username, 'queryHistory.json');

    var curResults;
    var queryHistory: string[] = [];
    var curQuery: string;

    // try and get the query history
    if(fs.existsSync(qHistPath)) {
        queryHistory = fs.readJsonSync(qHistPath).queries;
    }

    // And set its HTML content
    panel.webview.html = getQueryEditorPage();

    // handle a query
    panel.webview.onDidReceiveMessage(message => {
        // the structure of message is { toql: string, query: string }
        // or { save: boolean }
        if(message.query) {
            curQuery = message.query;
        }
        if(message.save && curResults) {
            // save the results
            const csv: boolean = vscode.window.forceCode.config.outputQueriesAsCSV;
            var data: string = csv ? outputToCSV(curResults) : outputToString(curResults);
            const defaultURI: vscode.Uri = {
                scheme: 'file',
                path: vscode.window.forceCode.projectRoot.split('\\').join('/'),
                fsPath: vscode.window.forceCode.projectRoot,
                authority: undefined,
                query: undefined,
                fragment: undefined,
                with: undefined,
                toJSON: undefined
            }
            vscode.window.showSaveDialog({ filters: csv ? { 'CSV': ['csv'] } : { 'JSON': ['json'] }, defaultUri: defaultURI }).then(uri => {
                if(uri) {
                    fs.outputFileSync(uri.fsPath, data);
                }
            });
        } else if(message.toql) {
            vscode.window.forceCode.conn.tooling.query(curQuery)
                .then(sendResults)
                .catch(onError);
        } else {
            vscode.window.forceCode.conn.query(curQuery)
                .then(sendResults)
                .catch(onError);
        }
    }, undefined);

    return sendQueryHistory();

    function sendResults(results) {
        curResults = results.records;
        const queryIndex: number = queryHistory.indexOf(curQuery);
        if(queryIndex !== -1) {
            queryHistory.splice(queryIndex, 1);
        }
        queryHistory.unshift(curQuery);
        if(queryHistory.length > vscode.window.forceCode.config.maxQueryHistory) {
            queryHistory.pop();
        }
        // save the query history
        fs.outputFileSync(qHistPath, JSON.stringify({ queries: queryHistory }, undefined, 4));
        var resToSend: {}
        if(results.totalSize > 0) {
            resToSend = {
                success: true,
                results: outputToCSV(curResults),
                limit: vscode.window.forceCode.config.maxQueryResultsPerPage
            }
        } else {
            resToSend = {
                success: false,
                results: 'The query you entered returned no results',
            }
        }
        sendData(resToSend);
        sendQueryHistory();
    }

    function onError(err) {
        var errToSend: {} = {
            success: false,
            results: err && err.message ? err.message : err
        }
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