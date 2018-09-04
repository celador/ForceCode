import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';

export function getIcon(toolingType: string) {
    switch (toolingType) {
        case 'ApexClass':
            return 'file-code';
        case 'ApexPage':
            return 'code';
        case 'ApexTrigger':
            return 'zap';
        case 'ApexComponent':
            return 'gist';
        case 'ApexLog':
            return 'bug';
        case 'StandardObject':
            return 'gist';
        case 'CustomObject':
            return 'gist';
        default:
            return 'code';
    }
}
export function getFileExtension(document: vscode.TextDocument) {
    var ext: string = document.fileName.substring(document.fileName.lastIndexOf('.') + 1, document.fileName.length);
    return ext;
}
export function getExtension(toolingType: string) {
    switch (toolingType) {
        case 'ApexClass':
            return 'cls';
        case 'ApexPage':
            return 'page';
        case 'ApexTrigger':
            return 'trigger';
        case 'ApexComponent':
            return 'component';
        case 'ApexLog':
            return 'log';
        case 'PermissionSet':
            return 'permissionset';
        case 'Controller':
        case 'Helper':
        case 'Renderer':
            return 'js';
        case 'Documentation':
            return 'auradoc';
        case 'Design':
            return 'design';
        case 'Svg':
            return 'svg';
        case 'Style':
            return 'css';
        case 'Component':
            return 'cmp';
        case 'Application':
            return 'app';
        case 'StaticResource':
            return 'resource';
        case 'AuraDefinitionBundle':
            return 'aura';
        case 'Event':
            return 'evt';
        case 'Interface':
            return 'intf';
        case 'Tokens':
            return 'tokens';
        default:
            throw toolingType + ' extension not defined';
    }
}
export function getFolder(toolingType: string) {
    switch (toolingType) {
        case 'ApexClass':
            return 'classes';
        case 'ApexPage':
            return 'pages';
        case 'ApexTrigger':
            return 'triggers';
        case 'ApexComponent':
            return 'components';
        case 'ApexLog':
            return 'logs';
        case 'PermissionSet':
            return 'permissionsets';
        default:
            return 'classes';
    }
}
export function getToolingTypeFromFolder(uri: vscode.Uri): string {
    switch(uri.fsPath.split(path.sep).pop()) {
        case 'classes':
            return 'ApexClass';
        case 'pages':
            return 'ApexPage';
        case 'triggers':
            return 'ApexTrigger';
        case 'aura':
            return 'AuraDefinitionBundle';
        case 'components':
            return 'ApexComponent';
        default:
            return undefined;
    }
}
export function getAnyTTFromFolder(uri: vscode.Uri): string {
    if(uri.fsPath.indexOf(vscode.window.forceCode.workspaceRoot) === -1) {
        return undefined;
    }
    var baseDirectoryName: string;
    if(fs.lstatSync(uri.fsPath).isDirectory()) {
        baseDirectoryName = path.parse(uri.fsPath).name;
    } else {
        var fileNameParts: string[] = uri.fsPath.split(path.sep);
        baseDirectoryName = fileNameParts[fileNameParts.length - 2];
    }    
    var types: any[] = vscode.window.forceCode.describe.metadataObjects
        .filter(o => o.directoryName === baseDirectoryName)
        .map(r => {
            return r.xmlName;
        });
    if (types.length <= 0 && uri.fsPath.indexOf('aura') !== -1) {
        types = ['AuraDefinitionBundle'];
    }
    return types[0];
}
export function getAnyNameFromUri(uri: vscode.Uri): string {
    var baseDirectoryName: string = path.parse(uri.fsPath).name;
    if(fs.lstatSync(uri.fsPath).isDirectory()) {
        if(uri.fsPath.indexOf('aura') !== -1) {
            if(baseDirectoryName === 'aura') {
                baseDirectoryName = '*';
            }
        } else {
            baseDirectoryName = '*';
        }
    } 
    return baseDirectoryName;
}
