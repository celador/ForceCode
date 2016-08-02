import * as vscode from 'vscode';
export default function getName(document: vscode.TextDocument, toolingType: string): string {
    'use strict';
    if (toolingType === 'ApexClass') {
        return getNameFromClassBody(document);
    } else if (toolingType === 'AuraDefinition') {
      return getAuraNameFromFileName(document.fileName);
    }
    return getFileName(document);
}
export function getFileName(document: vscode.TextDocument) {
    'use strict';
    var fileName: string = document.fileName.substring(0, document.fileName.lastIndexOf('.'));
    fileName = fileName.substring(fileName.lastIndexOf('/') + 1, fileName.length);
    return fileName;
}
function getNameFromClassBody(document: vscode.TextDocument): string {
    'use strict';
    var fileName: string = getFileName(document);
    var bodyParts: string[] = document.getText().split(/(implements|\{)/);
    var firstLine: string = bodyParts.length && bodyParts[0];
    var words: string[] = firstLine.trim().split(' ');
    var className: string = words.length && words[words.length - 1];
    if (fileName !== className) {
        vscode.window.showWarningMessage(`Class Name (${className}) is not the same as the File Name(${fileName}).  Please fix this.`);
    }
    return className;
}
export function getAuraNameFromFileName(fileName: string): string {
    'use strict';
    var parts: string[] = fileName.split('src/aura/');
    var auraNameParts: string[] = (parts && parts.length) > 1 ? parts[1].split('/') : undefined;
    var auraName: string = (auraNameParts && auraNameParts.length) > 0 ? auraNameParts[0] : undefined;
    return auraName;
}
