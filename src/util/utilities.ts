import * as fs from 'fs-extra';
import * as path from 'path';
import { getSrcDir } from '../services/configuration';
import * as vscode from 'vscode';

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
    fs.outputFileSync(getSrcDir() + path.sep + fileName, data);
    return Promise.resolve(getSrcDir() + path.sep + fileName);
  } catch (e) {
    return Promise.reject(undefined);
  }
}

export function removeFile(fileName: string): Promise<any> {
  try {
    fs.removeSync(getSrcDir() + path.sep + fileName);
    return Promise.resolve(undefined);
  } catch (e) {
    return Promise.reject(undefined);
  }
}

export function toArray(toConvert: any): any[] {
  return Array.isArray(toConvert) ? toConvert : [toConvert];
}

export function inDebug(): boolean {
  return vscode.env.machineId === 'someValue.machineId';
}
