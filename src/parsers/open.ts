import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { IMetadataObject } from '../forceCode';
import { getFolderContents, getMembers } from '../commands/packageBuilder';
import { PXMLMember } from '../services';

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
    return getAnyTTFromPath(uri.fsPath);    
}
export function getAnyTTFromPath(thepath: string): string {
    if(thepath.indexOf(vscode.window.forceCode.projectRoot) === -1) {
        return undefined;
    }
    var fileName: string = thepath.split(vscode.window.forceCode.projectRoot + path.sep)[1];
    var baseDirectoryName: string = fileName.split(path.sep)[0];
    var types: any[] = vscode.window.forceCode.describe.metadataObjects
        .filter(o => o.directoryName === baseDirectoryName)
        .map(r => {
            return r.xmlName;
        });
    return types[0];
}

function isFoldered(toolingType: string): boolean {
    if(toolingType && toolingType.endsWith('Folder')) {
        return true;
    }
    const metadata: IMetadataObject = vscode.window.forceCode.describe.metadataObjects
        .find(mObject => mObject.xmlName === toolingType);
    return metadata ? metadata.inFolder : false;
}

export function getAnyNameFromUri(uri: vscode.Uri): Promise<PXMLMember> {
    return new Promise((resolve) => {
        const projRoot: string = vscode.window.forceCode.projectRoot + path.sep;
        const ffNameParts: string[] = uri.fsPath.split(projRoot)[1].split(path.sep);
        var baseDirectoryName: string = path.parse(uri.fsPath).name;
        const isAura: boolean = ffNameParts[0] === 'aura';
        const isDir: boolean = fs.lstatSync(uri.fsPath).isDirectory();
        const tType: string = getAnyTTFromFolder(uri);
        const isInFolder: boolean = isFoldered(tType);
        var folderedName: string;
        if(isInFolder && ffNameParts.length > 2) {
            console.log('infolder length 3');
            // we have foldered metadata
            ffNameParts.shift();
            folderedName = ffNameParts.join('/').split('.')[0];
            resolve({ name: tType, members: [folderedName] });
        } else if(isDir) {
            if(isAura) {
                if(baseDirectoryName === 'aura') {
                    baseDirectoryName = '*';
                }
                resolve({ name: tType, members: [baseDirectoryName] });
            } else if(isInFolder && ffNameParts.length > 1) {
                console.log('infolder length 2');
                getFolderContents(tType, ffNameParts[1]).then(contents => {
                    resolve({ name: tType, members: contents });
                });
                
            } else if(isInFolder) {
                console.log('infolder');
                getMembers([tType]).then(members => {
                    resolve(members[0]);
                });
            } else {
                baseDirectoryName = '*';
                resolve({ name: tType, members: [baseDirectoryName] });
            }
        } else {
            resolve({ name: tType, members: [baseDirectoryName] });
        }
    });
}
export function getAnyFolderNameFromTT(tType: string): string {
    var folder: any[] = vscode.window.forceCode.describe.metadataObjects
        .filter(o => o.xmlName === tType)
        .map(r => {
            return r.directoryName;
        });

    return folder[0];
}
export function getAnyExtNameFromTT(tType: string): any {
    var folder: any[] = vscode.window.forceCode.describe.metadataObjects
        .filter(o => o.xmlName === tType)
        .map(r => {
            return r.suffix;
        });

    return folder[0];
}