import * as vscode from 'vscode';
import { dxService, getVSCodeSetting } from '../services';

export class ForceCodeLogProvider implements vscode.TextDocumentContentProvider {
  provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
    let logId: string | undefined = uri.query.substring(2, 20);

    const debugString = logId.substr(0, 'debugLog'.length);
    if (debugString === 'debugLog') {
      logId = undefined;
    }
    return dxService.getDebugLog(logId).then(filterLog);
  }
}

export function filterLog(body: string) {
  if (!getVSCodeSetting('debugOnly')) {
    return body;
  } else {
    let theLog = '';
    let includeIt = false;
    let debugLevel = ['USER_DEBUG'];
    if (getVSCodeSetting('debugFilter')) {
      debugLevel = getVSCodeSetting('debugFilter').split('|');
    }
    body.split('\n').forEach(l => {
      let theSplitLine: string[] = l.split(')|');
      if (
        theSplitLine.length > 1 &&
        theSplitLine[0].split(':').length === 3 &&
        theSplitLine[0].split('(').length === 2
      ) {
        includeIt = false;
        debugLevel.forEach(i => {
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
