import { getVSCodeSetting } from '../services';
import { VSCODE_SETTINGS } from '../services/configuration';

export function filterLog(body: string) {
  if (!getVSCodeSetting(VSCODE_SETTINGS.debugOnly)) {
    return body;
  } else {
    let theLog = '';
    let includeIt = false;
    let debugLevel = ['USER_DEBUG'];
    if (getVSCodeSetting(VSCODE_SETTINGS.debugFilter)) {
      debugLevel = getVSCodeSetting(VSCODE_SETTINGS.debugFilter).split('|');
    }
    body.split('\n').forEach((l) => {
      let theSplitLine: string[] = l.split(')|');
      if (
        theSplitLine.length > 1 &&
        theSplitLine[0].split(':').length === 3 &&
        theSplitLine[0].split('(').length === 2
      ) {
        includeIt = false;
        debugLevel.forEach((i) => {
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
