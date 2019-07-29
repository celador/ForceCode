import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';

export function isEmptyUndOrNull(param: any): boolean {
  return (
    !(param instanceof Error) &&
    (param == undefined ||
      param == null ||
      (Array.isArray(param) && param.length === 0) ||
      Object.keys(param).length === 0)
  );
}

export function saveToFile(data: any, fileName: string): Promise<string> {
  try {
    fs.outputFileSync(vscode.window.forceCode.projectRoot + path.sep + fileName, data);
    return Promise.resolve(vscode.window.forceCode.projectRoot + path.sep + fileName);
  } catch (e) {
    return Promise.reject(undefined);
  }
}

export function removeFile(fileName: string): Promise<any> {
  try {
    fs.removeSync(vscode.window.forceCode.projectRoot + path.sep + fileName);
    return Promise.resolve(undefined);
  } catch (e) {
    return Promise.reject(undefined);
  }
}

export function toArray(toConvert: any): any[] {
  if (!Array.isArray(toConvert)) {
    return [toConvert];
  } else {
    return toConvert;
  }
}
