import * as vscode from 'vscode';
import * as path from 'path';
import { getSrcDir } from '../services/configuration';

export function getName(
  document: vscode.TextDocument,
  toolingType: string | undefined
): string | undefined {
  if (toolingType === 'ApexClass') {
    return getNameFromClassBody(document);
  } else if (toolingType === 'AuraDefinition') {
    return getAuraNameFromFileName(document.fileName, 'aura');
  } else if (toolingType === 'LightningComponentResource') {
    return getAuraNameFromFileName(document.fileName, 'lwc');
  }
  return getFileName(document);
}
export function getFileName(document: vscode.TextDocument) {
  let fileName: string | undefined = document.fileName
    .substring(0, document.fileName.lastIndexOf('.'))
    .split(path.sep)
    .pop();
  fileName = fileName?.split('.')[0];
  return fileName;
}
export function getWholeFileName(document: vscode.TextDocument) {
  return document.fileName.split(path.sep).pop();
}
function getNameFromClassBody(document: vscode.TextDocument): string | undefined {
  let fileName: string | undefined = getFileName(document);
  let bodyParts: string[] = document.getText().split(/(extends|implements|\{)/);
  let firstLine: string = bodyParts.length > 0 ? bodyParts[0] : '';
  let words: string[] = firstLine.trim().split(' ');
  let className: string = words.length > 0 ? words[words.length - 1] : '';
  if (fileName !== className) {
    return fileName;
  }
  return className;
}
export function getAuraNameFromFileName(fileName: string, folderName: string): string | undefined {
  const fnSplit = fileName.split(`${getSrcDir()}${path.sep}${folderName}${path.sep}`).pop();
  return fnSplit?.split(path.sep).shift() || '';
}
