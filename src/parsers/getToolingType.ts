import * as vscode from 'vscode';
import * as path from 'path';

export default function getToolingTypeFromBody(document: vscode.TextDocument, member = false): string {

    if (document.fileName.endsWith('.cls')) {
        return member ? 'ApexClassMember' : 'ApexClass';
    }
    if (document.fileName.endsWith('.trigger')) {
        return member ? 'ApexTriggerMember' : 'ApexTrigger';
    }
    if (document.fileName.endsWith('.component')) {
        return member ? 'ApexComponentMember' : 'ApexComponent';
    }
    if (document.fileName.endsWith('.page')) {
        return member ? 'ApexPageMember' : 'ApexPage';
    }
    if (document.fileName.endsWith('.permissionset')) {
        return 'PermissionSet';
    }
    if (document.fileName.endsWith('.object')) {
        return 'CustomObject';
    }
    if (document.fileName.endsWith('.labels')) {
        return 'CustomLabels';
    }
	// Here is replaceSrc possiblity
    // if (document.fileName.indexOf(`${vscode.window.forceCode.workspaceRoot}${path.sep}aura`) >= 0) {
    if (document.fileName.indexOf(`${vscode.window.forceCode.config.src}${path.sep}aura`) >= 0) {
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

