import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import path = require('path');

interface IMetadataFileProperties {
    createdById: string;
    createdByName: string;
    createdDate: string;
    fileName: string;
    fullName: string;
    id: string;
    lastModifiedById: string;
    lastModifiedByName: string;
    lastModifiedDate: string;
    manageableState: string;
    namespacePrefix: string;
    type: string;
}

export default class Workspace implements forceCode.IWorkspaceService {
    // Get files in src folder..
    // Match them up with ContainerMembers
    public getWorkspaceMembers(metadata?): Promise<forceCode.IWorkspaceMember[]> {
        return new Promise((resolve, reject) => {
            var klaw: any = require('klaw');
            var members: forceCode.IWorkspaceMember[] = []; // files, directories, symlinks, etc
            klaw(vscode.window.forceCode.workspaceRoot)
                .on('data', function (item) {
                    // Check to see if the file represents an actual member... 
                    if (item.stats.isFile()) {
                        var metadataFileProperties: IMetadataFileProperties[] = getMembersFor(item);

                        if (metadataFileProperties.length) {

                            var workspaceMember: forceCode.IWorkspaceMember = {
                                name: metadataFileProperties[0].fullName,
                                path: item.path,
                                memberInfo: metadataFileProperties[0],
                            };
                            members.push(workspaceMember);
                        }
                    }
                })
                .on('end', function () {
                    resolve(members);
                    // console.dir(items) // => [ ... array of files]
                });
        });

        function getMembersFor(item): IMetadataFileProperties[] {
            var pathParts: string[] = item.path.split(path.sep);
            var filename: string = pathParts[pathParts.length - 1];
            var name: string = filename.substring(0, filename.lastIndexOf('.'));

            return vscode.window.forceCode.apexMetadata.filter(member => {
                return member.fullName === name;
            });
        }

    }
}
