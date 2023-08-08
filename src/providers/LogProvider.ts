import { getVSCodeSetting } from '../services';
import { VSCODE_SETTINGS } from '../services/configuration';

export function filterLog(body: string) {
  const debugOnly = getVSCodeSetting(VSCODE_SETTINGS.debugOnly);
  if (!debugOnly) {
    return body;
  }

  const debugFilter = getVSCodeSetting(VSCODE_SETTINGS.debugFilter) || 'USER_DEBUG';
  const debugLevels = debugFilter.split('|');

  return body
    .split('\n')
    .filter((line) => {
      const splitLine = line.split(')|');
      if (
        splitLine.length > 1 &&
        splitLine[0].split(':').length === 3 &&
        splitLine[0].split('(').length === 2
      ) {
        return debugLevels.some((level: string) => splitLine[1].split('|')[0] === level);
      }
      return false;
    })
    .join('\n');
}
