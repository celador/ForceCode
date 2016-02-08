import * as vscode from 'vscode';
export default function getName(document: vscode.TextDocument, toolingType: string): string {
    'use strict';
    if (toolingType === 'ApexClass') {
        return getNameFromClassBody(document);
    }
    return getFileName(document);
}
function getFileName(document: vscode.TextDocument) {
    'use strict';
    var fileName: string = document.fileName.substring(0, document.fileName.lastIndexOf('.'));
    fileName = fileName.substring(fileName.lastIndexOf('/') + 1, fileName.length);
    return fileName;
}
function getNameFromClassBody(document: vscode.TextDocument): string {
    'use strict';
    var fileName: string = getFileName(document);
    var bodyParts: string[] = document.getText().split('{');
    var firstLine: string = bodyParts.length && bodyParts[0];
    var words: string[] = firstLine.trim().split(' ');
    var className: string = words.length && words[words.length - 1];
    // TODO: If the filename and the class name are not the same, show a warning message to rename the file
    if (fileName !== className) {
        vscode.window.showWarningMessage(`Class Name (${className}) is not the same as the File Name(${fileName}).  Please fix this.`);
    }
    return className;
}
