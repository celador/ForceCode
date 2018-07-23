import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';
const ZIP: any = require('zip');
const fetch: any = require('node-fetch');
const mime = require('mime-types');

import { getIcon, getExtension, getFolder } from './../parsers';
import { IWorkspaceMember } from '../forceCode';
import { commandService, codeCovViewService } from '../services';
import { FCFile } from '../services/codeCovView';
const TYPEATTRIBUTE: string = 'type';

export function openAura(context: vscode.ExtensionContext) {
    var predicate: string = `WHERE NamespacePrefix = '${vscode.window.forceCode.config.prefix ? vscode.window.forceCode.config.prefix : ''}'`;
    return Promise.resolve(vscode.window.forceCode)
        .then(() => showFileOptions([vscode.window.forceCode.conn.tooling.query('SELECT Id, DeveloperName, NamespacePrefix, Description FROM AuraDefinitionBundle ' + predicate)], false));
}

export function open(context: vscode.ExtensionContext) {
    return Promise.resolve(vscode.window.forceCode)
        .then(getFileList)
        .then(proms => showFileOptions(proms, true));
        
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function getFileList() {
        var metadataTypes: string[] = ['ApexClass', 'ApexTrigger', 'ApexPage', 'ApexComponent', 'StaticResource'];
        var predicate: string = `WHERE NamespacePrefix = '${vscode.window.forceCode.config.prefix ? vscode.window.forceCode.config.prefix : ''}'`;
        var promises: any[] = metadataTypes.map(t => {
            var sResource = t === 'StaticResource' ? ', ContentType' : '';
            var q: string = `SELECT Id, Name, NamespacePrefix${sResource} FROM ${t} ${predicate}`;
            return vscode.window.forceCode.conn.tooling.query(q);
        });
        return promises;
    }
}

export function showFileOptions(promises: any[], pickMany: boolean) {
    let bundleName: string = '';
    // TODO: Objects
    // TODO: Generic Metadata retrieve
    return Promise.all(promises).then(results => {
        let options: vscode.QuickPickItem[] = results
            .map(res => res.records)
            .reduce((prev, curr) => {
                return prev.concat(curr);
            })
            .map(record => {
                let toolingType: string = record.attributes[TYPEATTRIBUTE];
                let icon: string = getIcon(toolingType);
                let ext: string = getExtension(toolingType);
                let name: string = record.Name || record.DeveloperName;
                let sr: string = record.ContentType || '';
                return {
                    description: `${record.Id}`,
                    detail: `${record.attributes[TYPEATTRIBUTE]} ${sr}`,
                    label: `$(${icon}) - ${name}.${ext}`,
                };
            });
        let config: {} = {
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: 'Retrieve a Salesforce File',
            canPickMany: pickMany,
        };
        return vscode.window.showQuickPick(options, config);
    }).then(opt => {
        var opts: any = opt;
        if(!opts) {
            opts = [''];
        }
        var files: any[];
        if(opts instanceof Array) {
            files = opts.map(curOpt => {
                return getFile(curOpt);
            });
        } else {
            files = [getFile(opts)];
        }
        
        return Promise.all(files);
    })
    .then(res => {
        var count: number = 0;
        var showFile: boolean = vscode.window.forceCode.config.showFilesOnOpen ? true : false;
        var maxToShow: number = vscode.window.forceCode.config.showFilesOnOpenMax ? vscode.window.forceCode.config.showFilesOnOpenMax : 3;
        var thePromises: any[] = res.map(curRes => { 
            count++;
            if(count > maxToShow) {
                showFile = false;
            }
            return writeFiles(curRes, showFile).then(toRet => { return toRet; }); 
        });
        vscode.window.forceCode.showStatus('ForceCode: Retrieve Finished');
        return Promise.all(thePromises);
    })
    .then(() => {
        return commandService.runCommand('ForceCode.getCodeCoverage', undefined, undefined);
    })
    .catch(err => vscode.window.showErrorMessage(err.message));


    // =======================================================================================================================================
    function getFile(res: any) {
        if(res && res.detail) {
            var tType: string = res.detail.split(' ')[0];
            if (tType === 'AuraDefinitionBundle') {
                return vscode.window.forceCode.conn.tooling.query(`SELECT Id, AuraDefinitionBundleId, AuraDefinitionBundle.DeveloperName, DefType, Format FROM AuraDefinition where AuraDefinitionBundleId = '${res.description}'`).then(function (auraDefinitionResults) {
                    if (auraDefinitionResults.records && auraDefinitionResults.records.length > 0) {
                        bundleName = auraDefinitionResults.records[0].AuraDefinitionBundle.DeveloperName;
                    } else {
                        throw 'No bundle files';
                    }
                    return Promise.all(auraDefinitionResults.records.map(function (auraDefinition) {
                        return vscode.window.forceCode.conn.tooling.sobject('AuraDefinition').find({ Id: auraDefinition.Id }).execute();
                    })).then(function (results: any[]) {
                        return results.map(function (qr) {
                            return qr.length > 0 ? qr[0] : undefined;
                        });
                    });
                });
            } else {
                return vscode.window.forceCode.conn.tooling.sobject(tType)
                    .find({ Id: res.description }).execute();
            }
        } else {
            throw { message: 'No file selected to open' };
        }
    }


    // Right here we need to do something for Lightning components... see, what happens is that we Go search for bundles, which the bundles are the lightning components... 
    // The AuraDefinitions are part of the Lightning components.. so... we first get the definition of what the componenet has..
    // Then we can use the Id of the selected AuraDefinitionBundle to retrieve the actual AuraDefinition files that belong to it...
    // We query the different objects, then store them all in a folder, in the Aura folder... 



    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function writeFiles(results, openFile: boolean): Promise<any> {
        return Promise.all(results.map(function (res) {
            var filename: string = '';
            let toolingType: string = res.attributes[TYPEATTRIBUTE];
            if (toolingType === 'AuraDefinition') {
                if (res.DefType && res.DefType.length > 0) {
                    var defType: string = res.DefType.toLowerCase().split('').map((c, i) => i === 0 ? c.toUpperCase() : c).join('');
                }
                let extension: string = getExtension(defType);
                let actualFileName: string = extension === 'js' ? bundleName + defType : bundleName;
                // Here is replaceSrc possiblity
                filename = `${vscode.window.forceCode.workspaceRoot}${path.sep}aura${path.sep}${bundleName}${path.sep}${actualFileName}.${extension}`;
                let body: string = res.Source;
                return new Promise((resolve, reject) => {
                    fs.outputFile(filename, body, function (err) {
                        if (err) { reject(err); }
                        //if (results.length === 1 && openFile) {
                        //    vscode.workspace.openTextDocument(filename).then(doc => vscode.window.showTextDocument(doc, { preview: false }));
                        //}
                        resolve(true);
                    });
                });
            } else if (toolingType === 'StaticResource') {
                var headers: any = {
                    'Accept': 'application/json',
                    'Authorization': 'OAuth ' + vscode.window.forceCode.dxCommands.orgInfo.accessToken,
                };
                return fetch(vscode.window.forceCode.dxCommands.orgInfo.instanceUrl + res.Body, { method: 'GET', headers }).then(resource => {
                    return new Promise(function (resolve, reject) {
                        var bufs: any = [];
                        resource.body.on('data', function (d) {
                            bufs.push(d);
                        });
                        resource.body.on('error', function (err) {
                            reject(err || {message: 'package not found'});
                        });
                        resource.body.on('end', function () {
                            var ctFolderName = res.ContentType.split('/').join('.');    // so we can deploy things other than zip files
                            if(res.ContentType.includes('zip')) {
                                var reader: any[] = ZIP.Reader(Buffer.concat(bufs));
                                reader.forEach(function (entry) {
                                    if (entry.isFile()) {
                                        var name: string = entry.getName();
                                        var data: Buffer = entry.getData();
                                        var filePath: string = `${vscode.workspace.workspaceFolders[0].uri.fsPath}${path.sep}resource-bundles${path.sep}${res.Name}.resource.${ctFolderName}${path.sep}${name}`;
                                        fs.outputFileSync(filePath, data);
                                    }
                                });
                            } else {
                                // this will work for most other things...
                                var theData: any;
                                if(res.ContentType.includes('image') || res.ContentType.includes('shockwave-flash')) {
                                    theData = new Buffer(Buffer.concat(bufs).toString('base64'), 'base64');
                                } else {
                                    theData = Buffer.concat(bufs).toString(mime.charset(res.ContentType) || 'UTF-8');
                                }
                                var ext = mime.extension(res.ContentType);
                                var filePath: string = `${vscode.workspace.workspaceFolders[0].uri.fsPath}${path.sep}resource-bundles${path.sep}${res.Name}.resource.${ctFolderName}${path.sep}${res.Name}.${ext}`;
                                fs.outputFileSync(filePath, theData);
                            }
                            resolve({ success: true });
                        });
                    });
                });
                
            }else {
                filename = `${vscode.window.forceCode.workspaceRoot}${path.sep}${getFolder(toolingType)}${path.sep}${res.Name || res.FullName}.${getExtension(toolingType)}`;
                var workspaceMember: IWorkspaceMember = {
                    name: res.FullName,
                    path: filename,
                    id: res.Id, 
                    lastModifiedDate: res.LastModifiedDate,
                    lastModifiedByName: res.LastModifiedByName,
                    lastModifiedById: res.LastModifiedById,
                    type: toolingType,
                };
                
                let body: string = res.Body || res.Markup;
                return new Promise((resolve, reject) => {
                    fs.outputFile(filename, body, function (err) {
                        if (err) { reject(err); }
                        codeCovViewService.addOrUpdateClass(workspaceMember);
                        if (results.length === 1 && openFile) {
                            try{
                                vscode.workspace.openTextDocument(filename).then(doc => vscode.window.showTextDocument(doc, { preview: false }));
                            } catch (e) {}
                        }
                    });
                    resolve(true);
                });
            }
        }));
    }
}
