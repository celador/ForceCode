import * as vscode from 'vscode';
export default function getName(document: vscode.TextDocument, toolingType: string): string {
    if (toolingType === 'ApexClass') {
        return getNameFromClassBody(document);
    } else if (toolingType === 'AuraDefinition') {
      return getAuraNameFromFileName(document.fileName);
    }
    return getFileName(document);
}
export function getFileName(document: vscode.TextDocument) {
    // const slash: string = vscode.window.forceCode.pathSeparator;
    var fileName: string = document.fileName.substring(0, document.fileName.lastIndexOf('.'));
    var fileNameArray: string[] = fileName.split(/[\\\/]/);
    fileName = fileNameArray[fileNameArray.length - 1];
    return fileName;
}
function getNameFromClassBody(document: vscode.TextDocument): string {
    const slash: string = vscode.window.forceCode.pathSeparator;
    var fileNameArray: string[] = getFileName(document).split(slash);
    var fileName: string = fileNameArray[fileNameArray.length - 1];
    var bodyParts: string[] = document.getText().split(/(extends|implements|\{)/);
    var firstLine: string = bodyParts.length && bodyParts[0];
    var words: string[] = firstLine.trim().split(' ');
    var className: string = words.length && words[words.length - 1];
    if (fileName !== className) {
        vscode.window.forceCode.outputChannel.appendLine(`It appears to me that the Class Name (${className}) is not the same as the File Name (${fileName}).  You may want to fix this.  Be warned, I am saving it as ${className}`);
    }
    return className;
}
export function getAuraNameFromFileName(fileName: string): string {
    const slash: string = vscode.window.forceCode.pathSeparator;
    var parts: string[] = fileName.split(`src${slash}aura${slash}`);
    var auraNameParts: string[] = (parts && parts.length) > 1 ? parts[1].split(slash) : undefined;
    var auraName: string = (auraNameParts && auraNameParts.length) > 0 ? auraNameParts[0] : undefined;
    return auraName;
}
