import * as vscode from 'vscode';
export default function getToolingTypeFromBody(document: vscode.TextDocument, member = false): string {
    // var body: string = document.getText();
    // var bodyParts: string[] = body.split('{');
    const slash: string = vscode.window.forceCode.pathSeparator;

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
	// Here is replaceSrc possiblity
    if (document.fileName.indexOf(vscode.window.forceCode.config.src + slash + 'aura') >= 0) {
        return 'AuraDefinition';
    }
    return undefined;
}

