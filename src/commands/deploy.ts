import * as vscode from 'vscode';
import { dxService, codeCovViewService, fcConnection, toArray, PXML, PXMLMember, commandService } from '../services';
import { getFileListFromPXML, zipFiles } from './../services';
import * as path from 'path';
import { FCFile } from '../services/codeCovView';
import { IWorkspaceMember } from '../forceCode';
import klaw = require('klaw');
import { getAuraNameFromFileName } from '../parsers';
import * as xml2js from 'xml2js';
import * as fs from 'fs-extra';
import constants from '../models/constants';
import { getAnyTTFromPath } from '../parsers/open';
import { outputToString } from '../parsers/output';

export default function deploy(context: vscode.ExtensionContext) {
    vscode.window.forceCode.outputChannel.clear();
    const deployPath: string = vscode.window.forceCode.projectRoot;

    var deployOptions: any = {
        checkOnly: true,
        ignoreWarnings: false,
        rollbackOnError: true,
        singlePackage: true,
        allowMissingFiles: true,
    };

    let options: vscode.QuickPickItem[] = [{
        label: 'Deploy from package.xml',
        detail: 'If you have a package.xml file you can deploy based off of the contents of this file',
    },
    {
        label: 'Choose files',
        detail: 'WARNING: This will overwrite your package.xml file and deploy any destructiveChanges.xml files!!!',
    }];
    let config: {} = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Choose files to deploy',
    };
    return vscode.window.showQuickPick(options, config).then(choice => {
        if (dxService.isEmptyUndOrNull(choice)) {
            return Promise.resolve();
        }
        if (choice.label === 'Choose files') {
            return getFileList()
                .then(showFileList)
                .then(createPackageXML)
                .then(getFileListFromPXML)
                .then(deployFiles);
        } else {
            return getFileListFromPXML()
                .then(deployFiles);
        }
    });

    function getFileList(): Promise<string[]> {
        return new Promise((resolve) => {
            var fileList: string[] = [];
            klaw(vscode.window.forceCode.projectRoot)
                .on('data', (file) => {
                    if (file.stats.isFile() && !file.path.match(/resource\-bundles.*\.resource.*$/)
                        && !(vscode.window.forceCode.config.spaDist !== '' 
                        && file.path.indexOf(vscode.window.forceCode.config.spaDist) !== -1)
                        && !file.path.endsWith('-meta.xml')) {

                        if (file.path.indexOf(path.join(vscode.window.forceCode.projectRoot, 'aura')) !== -1) {
                            const auraPath: string = path.join(vscode.window.forceCode.projectRoot, 'aura', getAuraNameFromFileName(file.path));
                            if (fileList.indexOf(auraPath) === -1) {
                                fileList.push(auraPath);
                            }
                            // this check will exclude files like package.xml
                        } else if (file.path.split(vscode.window.forceCode.projectRoot).length > 1) {
                            fileList.push(file.path);
                        }
                    }
                })
                .on('end', () => {
                    resolve(fileList.sort());
                })
        });
    }

    function showFileList(files: string[]) {
        return new Promise((resolve) => {
            let options: vscode.QuickPickItem[] = files
                .map(file => {
                    return {
                        label: file.split(path.sep).pop(),
                        detail: file,
                    };
                });
            let config: {} = {
                matchOnDescription: true,
                matchOnDetail: true,
                placeHolder: files.length === 0 ? 'No files in the current project' : 'Choose files to deploy',
                canPickMany: true,
            };
            vscode.window.showQuickPick(options, config).then(files => {
                if(dxService.isEmptyUndOrNull(files)) {
                    resolve();
                }
                var theFiles: string[] = [];
                toArray(files).forEach(file => {
                    if(file) {
                        theFiles.push(file.detail);
                    }
                });
                resolve(theFiles);
            });
        });
    }

    function findMDTIndex(pxmlObj: PXML, type: string) {
        return pxmlObj.Package.types.findIndex(curType => { return curType.name === type; });
    }

    function createPackageXML(files: string[]): Promise<any> {
        return new Promise((resolve) => {
            const builder = new xml2js.Builder();
            var packObj: PXML = {
                Package: {
                    types: [],
                    version: vscode.window.forceCode.config.apiVersion || constants.API_VERSION
                },
            }
            files.forEach(file => {
                const fileTT: string = getAnyTTFromPath(file);
                var member: string;
                if(fileTT === 'AuraDefinitionBundle') {
                    member = getAuraNameFromFileName(file);
                } else {
                    member = file.split(path.sep).pop().split('.')[0];
                }
                const index: number = findMDTIndex(packObj, fileTT);
                if(index !== -1) {
                    packObj.Package.types[index].members.push(member);
                } else {
                    var newMem: PXMLMember = {
                        members: [member],
                        name: fileTT
                    }
                    packObj.Package.types.push(newMem);
                }
            });
            var xml: string = builder.buildObject(packObj)
                .replace('<Package>', '<Package xmlns="http://soap.sforce.com/2006/04/metadata">')
                .replace(' standalone="yes"', '');
            resolve(fs.outputFileSync(path.join(vscode.window.forceCode.projectRoot, 'package.xml'), xml));
        });
    }

    function deployFiles(files: string[]): Promise<any> {
        if(dxService.isEmptyUndOrNull(files)) {
            return Promise.resolve();
        }
        var zip = zipFiles(files, deployPath);
        Object.assign(deployOptions, vscode.window.forceCode.config.deployOptions);
        vscode.window.forceCode.outputChannel.show();
        return vscode.window.forceCode.conn.metadata.deploy(zip, deployOptions)
            .complete(function (err, result) {
                if (err) {
                    return err;
                } else {
                    return result;
                }
            })
            .catch(finished)
            .then(finished);


        // =======================================================================================================================================
        function finished(res) /*Promise<any>*/ {
            if (res.status !== 'Failed') {
                // update the wsMembers with the newer date
                files.forEach(file => {
                    const curFCFile: FCFile = codeCovViewService.findByPath(path.join(deployPath, file));
                    if (curFCFile) {
                        const wsMem: IWorkspaceMember = curFCFile.getWsMember();
                        wsMem.lastModifiedDate = (new Date()).toISOString();
                        wsMem.lastModifiedById = fcConnection.currentConnection.orgInfo.userId;
                        wsMem.saveTime = true;
                        curFCFile.updateWsMember(wsMem);
                    }
                });
                vscode.window.forceCode.showStatus('ForceCode: Deployed $(thumbsup)');
            } else if(res.status !== 'Failed') {
                vscode.window.showErrorMessage('ForceCode: Deploy Errors. View Details?', 'Yes', 'No').then(choice => {
                    if(choice === 'Yes') {
                        commandService.runCommand('ForceCode.openFileInOrg', 
                            'changemgmt/monitorDeploymentsDetails.apexp?retURL=/changemgmt/monitorDeployment.apexp&asyncId='
                            + res.id);
                    }
                });
            } else {
                var depId: string;
                if(res.id) {
                    depId = res.id;
                } else {
                    const message: string = res.message ? res.message : res;
                    if(!message.startsWith('Polling time out')) {
                        throw res;  // we don't know what happened so just throw it
                    }
                    depId = (res.message ? res.message : res).split(' = ').pop();
                    vscode.window.showErrorMessage('ForceCode: Deployment timed out. View details status in the org?', 'Yes', 'No').then(choice => {
                        if(choice === 'Yes') {
                            commandService.runCommand('ForceCode.openFileInOrg', 
                                'changemgmt/monitorDeploymentsDetails.apexp?retURL=/changemgmt/monitorDeployment.apexp&asyncId='
                                + depId);
                        }
                    });
                }
            }
            vscode.window.forceCode.outputChannel.append(outputToString(res).replace(/{/g, '').replace(/}/g, ''));
            return res;
        }
    }
}