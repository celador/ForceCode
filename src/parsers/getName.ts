import * as vscode from 'vscode';
import * as path from 'path';

export default function getName(
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
  var fileName: string | undefined = document.fileName
    .substring(0, document.fileName.lastIndexOf('.'))
    .split(path.sep)
    .pop();
  fileName = fileName ? fileName.split('.')[0] : undefined;
  return fileName;
}
export function getWholeFileName(document: vscode.TextDocument) {
  return document.fileName.split(path.sep).pop();
}
function getNameFromClassBody(document: vscode.TextDocument): string | undefined {
  var fileName: string | undefined = getFileName(document);
  var bodyParts: string[] = document.getText().split(/(extends|implements|\{)/);
  var firstLine: string = bodyParts.length > 0 ? bodyParts[0] : '';
  var words: string[] = firstLine.trim().split(' ');
  var className: string = words.length > 0 ? words[words.length - 1] : '';
  if (fileName !== className) {
    return fileName;
  }
  return className;
}
export function getAuraNameFromFileName(fileName: string, folderName: string): string | undefined {
  const fnSplit = fileName
    .split(`${vscode.window.forceCode.config.src}${path.sep}${folderName}${path.sep}`)
    .pop();
  return fnSplit ? fnSplit.split(path.sep).shift() : '';
}
