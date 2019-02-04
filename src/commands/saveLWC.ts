import * as vscode from 'vscode';
import * as parsers from './../parsers';
import { codeCovViewService, fcConnection } from '../services';
import { FCFile } from '../services/codeCovView';
import diff from './diff';
import * as forceCode from './../forceCode';
import * as path from 'path';
import { createPackageXML, deployFiles } from './deploy';

// =======================================================================================================================================
// ================================                Lightning Components               ===========================================
// =======================================================================================================================================
export function saveLWC(document: vscode.TextDocument, toolingType: string, Metadata?: {}): Promise<any> {
    const fileName: string = document.fileName.split(path.sep).pop();
    const name: string = parsers.getName(document, toolingType);
    const Format: string = parsers.getFileExtension(document);
    var Source: string = document.getText();
    var currentObjectDefinition: any = undefined;
    if(Metadata) {
        return Promise.resolve(vscode.window.forceCode)
            .then(getLWCBundle)
            .then(ensureLWCBundle)
            .then(updateMetaData);
    }
    return Promise.resolve(vscode.window.forceCode)
        .then(getLWCBundle)
        .then(ensureLWCBundle)
        .then(bundle => {
            return getLWCDefinition(bundle)
                .then(definitions => upsertLWCDefinition(definitions, bundle));
        });
    
    function getLWCBundle() {
        return vscode.window.forceCode.conn.tooling.sobject('LightningComponentBundle').find({
            'DeveloperName': name, NamespacePrefix: vscode.window.forceCode.config.prefix || ''
        });
    }
    function ensureLWCBundle(results) {
        // If the Bundle doesn't exist, create it, else Do nothing
        if (results.length === 0 || !results[0]) {
            // Create LWC Bundle
            return createPackageXML([document.fileName], vscode.window.forceCode.storageRoot)
                .then(() => {
                    const files: string[] = [];
                    files.push(path.join('lwc', name));
                    files.push('package.xml');
                    return deployFiles(files, vscode.window.forceCode.storageRoot)
                        .then(getLWCBundle)
                        .then(bundle => {
                            results[0] = bundle;
                            var newWSMember: forceCode.IWorkspaceMember = {
                                id: results[0].Id ? results[0].Id : results[0].id,
                                name: name,
                                path: document.fileName,
                                lastModifiedDate: (new Date()).toISOString(),
                                lastModifiedByName: '',
                                lastModifiedById: fcConnection.currentConnection.orgInfo.userId,
                                type: 'LightningComponentBundle',
                                saveTime: true
                            }
                            codeCovViewService.addClass(newWSMember);
                            return results;
                        });
                });
        } else {
            return results;
        }
    }

    function updateMetaData(bundle) {
        return vscode.window.forceCode.conn.tooling.sobject('LightningComponentBundle').update({
            Metadata: Metadata,
            Id: bundle[0].Id
        }).then(res => {
            return res;
        }, err => {
            return err;
        });
    }

    function getLWCDefinition(bundle) {
        return vscode.window.forceCode.conn.tooling.sobject('LightningComponentResource').find({
            'LightningComponentBundleId': bundle[0].Id
        });
    }
    function upsertLWCDefinition(definitions, bundle) {
        // If the Definition doesn't exist, create it
        var def: any[] = definitions.filter(result => result.FilePath.split('/').pop() === fileName);
        currentObjectDefinition = def.length > 0 ? def[0] : undefined;
        var curFCFile: FCFile = codeCovViewService.findById(bundle[0].Id ? bundle[0].Id : bundle[0].id);
        if (currentObjectDefinition !== undefined) {
            if(curFCFile ? !curFCFile.compareDates(currentObjectDefinition.LastModifiedDate) : false) {
                return vscode.window.showWarningMessage('Someone has changed this file!', 'Diff', 'Overwrite').then(s => {
                    if (s === 'Diff') {
                        diff(document, true);
                        return {};
                    }
                    if (s === 'Overwrite') {
                        return updateLWC(curFCFile);
                    }
                    return {};
                });
            } else {
                return updateLWC(curFCFile);
            }
        } else if (bundle[0]) {
            return vscode.window.forceCode.conn.tooling.sobject('LightningComponentResource').create({ LightningComponentBundleId: bundle[0].Id ? bundle[0].Id : bundle[0].id, Format, Source }).then(res => {
                if(curFCFile) {
                    var tempWSMem: forceCode.IWorkspaceMember = curFCFile.getWsMember();
                    tempWSMem.lastModifiedDate = (new Date()).toISOString();
                    tempWSMem.lastModifiedByName = '';
                    tempWSMem.lastModifiedById = fcConnection.currentConnection.orgInfo.userId;
                    tempWSMem.saveTime = true;
                    curFCFile.updateWsMember(tempWSMem);
                }
                return res;
            }, err => {
                return {State: 'Error', message: 'Error: File not created on server either because the name of the file is incorrect or there are syntax errors.'};
            });
        }
        return undefined;
    }

    function updateLWC(fcfile: FCFile) {
        return vscode.window.forceCode.conn.tooling.sobject('LightningComponentResource').update({ Id: currentObjectDefinition.Id, Source }).then(res => {
            if(fcfile) {
                var tempWSMem: forceCode.IWorkspaceMember = fcfile.getWsMember();
                tempWSMem.lastModifiedDate = (new Date()).toISOString();
                tempWSMem.lastModifiedByName = '';
                tempWSMem.lastModifiedById = fcConnection.currentConnection.orgInfo.userId;
                tempWSMem.saveTime = true;
                fcfile.updateWsMember(tempWSMem);
            }
            return res;
        })
        .catch(err => { return { State: 'Error', message: err.message ? err.message : err }});
    }
}
