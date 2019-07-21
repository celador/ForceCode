import * as vscode from 'vscode';
import { dxService } from '../services';

export default class ForceCodeLogProvider implements vscode.TextDocumentContentProvider {
  provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
    var logId: string | undefined = uri.query.substring(2, 20);

    const debugString = logId.substr(0, 'debugLog'.length);
    if (debugString === 'debugLog') {
      logId = undefined;
    }
    return dxService.getDebugLog(logId).then(filterLog);
  }
}

export function filterLog(body: string) {
  if (!vscode.workspace.getConfiguration('force')['debugOnly']) {
    return body;
  } else {
    var theLog = '';
    var includeIt = false;
    var debugLevel = ['USER_DEBUG'];
    if (vscode.workspace.getConfiguration('force')['debugFilter']) {
      debugLevel = vscode.workspace.getConfiguration('force')['debugFilter'].split('|');
    }
    body.split('\n').forEach(function(l) {
      var theSplitLine: string[] = l.split(')|');
      if (
        theSplitLine.length > 1 &&
        theSplitLine[0].split(':').length === 3 &&
        theSplitLine[0].split('(').length === 2
      ) {
        includeIt = false;
        debugLevel.forEach(function(i) {
          if (theSplitLine[1].split('|')[0] === i) {
            includeIt = true;
          }
        });
      }

      if (includeIt) {
        theLog += l + '\n';
      }
    });
    return theLog;
  }
}
