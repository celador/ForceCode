import * as vscode from 'vscode';
import * as path from 'path';

export default function getToolingTypeFromBody(document: vscode.TextDocument, member = false): string {

    var fileName:string = document.fileName.split('-meta.xml')[0];
    if (fileName.endsWith('.cls')) {
        return member ? 'ApexClassMember' : 'ApexClass';
    }
    if (fileName.endsWith('.trigger')) {
        return member ? 'ApexTriggerMember' : 'ApexTrigger';
    }
    if (fileName.endsWith('.component')) {
        return member ? 'ApexComponentMember' : 'ApexComponent';
    }
    if (fileName.endsWith('.page')) {
        return member ? 'ApexPageMember' : 'ApexPage';
    }
	// Here is replaceSrc possiblity
    // if (document.fileName.indexOf(`${vscode.window.forceCode.workspaceRoot}${path.sep}aura`) >= 0) {
    if (fileName.indexOf(`${vscode.window.forceCode.config.src}${path.sep}aura`) >= 0) {
        return 'AuraDefinition';
    }
    return undefined;
}


export function getCoverageType(document: vscode.TextDocument): string {

    if (document.fileName.endsWith('.cls')) {
        return 'Class';
    }
    if (document.fileName.endsWith('.trigger')) {
        return 'Trigger';
    }
    return undefined;
}

