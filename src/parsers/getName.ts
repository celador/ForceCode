import * as vscode from 'vscode';
import * as path from 'path';

export default function getName(document: vscode.TextDocument, toolingType: string): string {
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
  var fileName: string = document.fileName.substring(0, document.fileName.lastIndexOf('.'));
  fileName = fileName
    .split(path.sep)
    .pop()
    .split('.')[0];
  return fileName;
}
export function getWholeFileName(document: vscode.TextDocument) {
  return document.fileName.split(path.sep).pop();
}
function getNameFromClassBody(document: vscode.TextDocument): string {
  var fileName: string = getFileName(document);
  var bodyParts: string[] = document.getText().split(/(extends|implements|\{)/);
  var firstLine: string = bodyParts.length && bodyParts[0];
  var words: string[] = firstLine.trim().split(' ');
  var className: string = words.length && words[words.length - 1];
  if (fileName !== className) {
    return fileName;
  }
  return className;
}
export function getAuraNameFromFileName(fileName: string, folderName: string): string {
  return fileName
    .split(`${vscode.window.forceCode.config.src}${path.sep}${folderName}${path.sep}`)
    .pop()
    .split(path.sep)
    .shift();
}
