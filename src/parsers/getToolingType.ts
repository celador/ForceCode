import * as vscode from 'vscode';
export default function getToolingTypeFromBody(document: vscode.TextDocument, member = false): string {
    'use strict';
    var body: string = document.getText();
    var bodyParts: string[] = body.split('{');

    var isClass: RegExpMatchArray = bodyParts && bodyParts[0] &&
        bodyParts[0].trim().match(/(private|global|public)(\svirtual|\sabstract|\swith sharing|\swithout sharing)?\s*class\s*\S*$/ig);
    var isTrigger: RegExpMatchArray = bodyParts && bodyParts[0] && bodyParts[0].trim().match(/trigger\s*\S*\s*on\s*\S*$/ig);
    var isPage: RegExpMatchArray = document.getText().trim().match(/^<\s*apex:page/g);
    var isComponent: RegExpMatchArray = document.getText().trim().match(/^<\s*apex:component/g);
    var isAuraDefinition: RegExpMatchArray = document.fileName.match(/aura/g);

    if (isClass || document.fileName.endsWith('.cls')) {
        return member ? 'ApexClassMember' : 'ApexClass';
    }
    if (isTrigger || document.fileName.endsWith('.trigger')) {
        return member ? 'ApexTriggerMember' : 'ApexTrigger';
    }
    if (isComponent || document.fileName.endsWith('.component')) {
        return member ? 'ApexComponentMember' : 'ApexComponent';
    }
    if (isPage || document.fileName.endsWith('.page')) {
        return member ? 'ApexPageMember' : 'ApexPage';
    }
    if (isAuraDefinition.length) {
        return 'AuraDefinition';
    }
    return undefined;
}

