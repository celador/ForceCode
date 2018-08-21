import * as vscode from 'vscode';
import * as path from 'path';
import * as parsers from './../parsers';
import { IWorkspaceMember } from '../forceCode';
import constants from './../models/constants';
import { commandService, codeCovViewService } from '../services';

export function getFileStream(fName: string, toolType: string): Promise<NodeJS.ReadableStream> {
    return new Promise(function(resolve) {
        var describe = vscode.window.forceCode.describe;
        let extension: string = parsers.getExtension(toolType);
        var metadataTypes: any[] = describe.metadataObjects
            .filter(o => o.suffix === extension);

        if (toolType === 'AuraDefinition') {
            var types: any[] = describe.metadataObjects
                .filter(o => o.xmlName === 'AuraDefinitionBundle')
                .map(r => {
                    return { name: r.xmlName, members: fName };
                });

            resolve(vscode.window.forceCode.conn.metadata.retrieve({
                unpackaged: { types: types },
                apiVersion: vscode.window.forceCode.config.apiVersion || constants.API_VERSION,
            }).stream());
        } else {
            var listTypes: any[] = metadataTypes
                .map(o => {
                    return {
                        type: o.xmlName,
                        folder: o.directoryName,
                    };
                });

            var retrieveTypes: any[] = metadataTypes
                .map(o => {
                    return {
                        name: o.xmlName,
                        members: '*',
                    };
                });
            // List the Metadata by that type
            return vscode.window.forceCode.conn.metadata.list(listTypes).then(res => {
                var files: string[] = [];
                var workspaceMember: IWorkspaceMember;
                // Match the metadata against the filepath
                if (Array.isArray(res)) {
                    files = res.filter(t => {
                        return t.fileName.match(fName);
                        // let r: string = '\\' + path.sep + '(' + vscode.window.forceCode.config.prefix + ')*' + '(\\\_\\\_)*' + fileName;
                        // return t.fileName.match(new RegExp(r, 'i'));
                    }).map(t => {
                        // update the metadata here since we're fetching the file. will help make sure the metadata doesn't become stale.
                        // if it already exists it will just be overwritten
                        workspaceMember = {
                            name: t.fullName,
                            path: `${vscode.window.forceCode.workspaceRoot}${path.sep}${parsers.getFolder(toolType)}${path.sep}${t.fullName}.${extension}`,
                            id: t.id, 
                            lastModifiedDate: t.lastModifiedDate,
                            lastModifiedByName: t.lastModifiedByName,
                            lastModifiedById: t.lastModifiedById,
                            type: t.type,
                        };
                        codeCovViewService.addClass(workspaceMember);
                        commandService.runCommand('ForceCode.getCodeCoverage', undefined, undefined);
                        return t.fileName;
                    });
                } else if (typeof res === 'object') {
                    workspaceMember = {
                        name: res['fullName'],
                        path: `${vscode.window.forceCode.workspaceRoot}${path.sep}${parsers.getFolder(toolType)}${path.sep}${res['fullName']}.${extension}`,
                        id: res['id'], 
                        lastModifiedDate: res['lastModifiedDate'],
                        lastModifiedByName: res['lastModifiedByName'],
                        lastModifiedById: res['lastModifiedById'],
                        type: res['type'],
                    };
                    codeCovViewService.addClass(workspaceMember);
                    commandService.runCommand('ForceCode.getCodeCoverage', undefined, undefined);
                    files.push(res['fileName']);
                }

                // Retrieve the file by it's name
                resolve(vscode.window.forceCode.conn.metadata.retrieve({
                    singlePackage: true,
                    specificFiles: files,
                    unpackaged: { types: retrieveTypes },
                    apiVersion: vscode.window.forceCode.config.apiVersion || constants.API_VERSION,
                }).stream());
            });
        }
    });
}