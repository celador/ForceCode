import * as vscode from 'vscode';
import constants from './../models/constants';
import * as parsers from './../parsers';
import { codeCovViewService, switchUserViewService } from '../services';
import { FCFile } from '../services/codeCovView';
import diff from './diff';
import * as forceCode from './../forceCode';

// =======================================================================================================================================
// ================================                Lightning Components               ===========================================
// =======================================================================================================================================
export function saveAura(document: vscode.TextDocument, toolingType: string, Metadata?: {}): Promise<any> {
    const name: string = parsers.getName(document, toolingType);
    const ext: string = parsers.getFileExtension(document);
    var DefType: string = getAuraDefTypeFromDocument(document);
    var Format: string = getAuraFormatFromDocument();
    var Source: string = document.getText();
    var currentObjectDefinition: any = undefined;
    // Aura Bundles are a special case, since they can be upserted with the Tooling API
    // Instead of needing to be compiled, like Classes and Pages..
    if(Metadata) {
        return Promise.resolve(vscode.window.forceCode)
            .then(getAuraBundle)
            .then(ensureAuraBundle)
            .then(updateMetaData);
    }
    return Promise.resolve(vscode.window.forceCode)
        .then(getAuraBundle)
        .then(ensureAuraBundle)
        .then(bundle => {
            return getAuraDefinition(bundle)
                .then(definitions => upsertAuraDefinition(definitions, bundle));
        });
    
    function getAuraBundle() {
        return vscode.window.forceCode.conn.tooling.sobject('AuraDefinitionBundle').find({
            'DeveloperName': name, NamespacePrefix: vscode.window.forceCode.config.prefix || ''
        });
    }
    function ensureAuraBundle(results) {
        // If the Bundle doesn't exist, create it, else Do nothing
        if (results.length === 0 || !results[0]) {
            if(Metadata) {
                throw {message: 'File must exist before updating its metadata file. Save the file first, then the metadata file.'};
            }
            // Create Aura Definition Bundle
            return vscode.window.forceCode.conn.tooling.sobject('AuraDefinitionBundle').create({
                DeveloperName: name,
                MasterLabel: name,
                ApiVersion: vscode.window.forceCode.config.apiVersion || constants.API_VERSION,
                Description: name.replace('_', ' '),
            }).then(bundle => {
                results[0] = [bundle];
                var newWSMember: forceCode.IWorkspaceMember = {
                    id: results[0].Id,
                    name: name,
                    path: document.fileName,
                    lastModifiedDate: (new Date()).toISOString(),
                    lastModifiedByName: '',
                    lastModifiedById: switchUserViewService.orgInfo.userId,
                    type: 'AuraDefinitionBundle'
                }
                codeCovViewService.addClass(newWSMember, true);
                return results;
            });
        } else {
            return results;
        }
    }

    function updateMetaData(bundle) {
        return vscode.window.forceCode.conn.tooling.sobject('AuraDefinitionBundle').update({
            Metadata: Metadata,
            Id: bundle[0].Id
        }).then(res => {
            return res;
        }, err => {
            return err;
        });
    }

    function getAuraDefinition(bundle) {
        return vscode.window.forceCode.conn.tooling.sobject('AuraDefinition').find({
            'AuraDefinitionBundleId': bundle[0].Id
        });
    }
    function upsertAuraDefinition(definitions, bundle) {
        // If the Definition doesn't exist, create it
        var def: any[] = definitions.filter(result => result.DefType === DefType);
        currentObjectDefinition = def.length > 0 ? def[0] : undefined;
        var curFCFile: FCFile = codeCovViewService.findById(bundle[0].Id);
        if (currentObjectDefinition !== undefined) {
            if(curFCFile ? curFCFile.compareDates(currentObjectDefinition.LastModifiedDate) : false) {
                return updateAura(curFCFile);
            } else {
                return vscode.window.showWarningMessage('Someone has changed this file!', 'Diff', 'Overwrite').then(s => {
                    if (s === 'Diff') {
                        diff(document, currentObjectDefinition.Source);
                        return {};
                    }
                    if (s === 'Overwrite') {
                        return updateAura(curFCFile);
                    }
                    return {};
                });
            }
        } else if (bundle[0]) {
            return vscode.window.forceCode.conn.tooling.sobject('AuraDefinition').create({ AuraDefinitionBundleId: bundle[0].Id, DefType, Format, Source }).then(res => {
                var tempWSMem: forceCode.IWorkspaceMember = curFCFile.getWsMember();
                tempWSMem.lastModifiedDate = (new Date()).toISOString();
                tempWSMem.lastModifiedByName = '';
                tempWSMem.lastModifiedById = switchUserViewService.orgInfo.userId;
                curFCFile.updateWsMember(tempWSMem);
                return res;
            }, err => {
                return {State: 'Error', message: 'Error: File not created on server either because the name of the file is incorrect or there are syntax errors.'};
            });
        }
        return undefined;
    }

    function updateAura(fcfile: FCFile) {
        return vscode.window.forceCode.conn.tooling.sobject('AuraDefinition').update({ Id: currentObjectDefinition.Id, Source }).then(res => {
            var tempWSMem: forceCode.IWorkspaceMember = fcfile.getWsMember();
            tempWSMem.lastModifiedDate = (new Date()).toISOString();
            tempWSMem.lastModifiedByName = '';
            tempWSMem.lastModifiedById = switchUserViewService.orgInfo.userId;
            fcfile.updateWsMember(tempWSMem);
            return res;
        });
    }

    function getAuraFormatFromDocument() {
        // is 'js', 'css', or 'xml'
        switch (ext) {
            case 'js':
                return 'js';
            case 'css':
                return 'css';
            default:
                return 'xml';
        }
    }
}

export function getAuraDefTypeFromDocument(document: vscode.TextDocument) {
    const fname: string = parsers.getName(document, 'AuraDefinition');
    const extension: string = parsers.getFileExtension(document);
    const fileName: string = parsers.getFileName(document);
    switch (extension) {
        case 'app':
            // APPLICATION — Lightning Components app
            return 'APPLICATION';
        case 'cmp':
            // COMPONENT — component markup
            return 'COMPONENT';
        case 'auradoc':
            // DOCUMENTATION — documentation markup
            return 'DOCUMENTATION';
        case 'css':
            // STYLE — style (CSS) resource
            return 'STYLE';
        case 'evt':
            // EVENT — event definition
            return 'EVENT';
        case 'design':
            // DESIGN — design definition
            return 'DESIGN';
        case 'svg':
            // SVG — SVG graphic resource
            return 'SVG';
        case 'js':
            var fileNameEndsWith: string = fileName.replace(fname, '').toLowerCase();
            if (fileNameEndsWith === 'controller') {
                // CONTROLLER — client-side controller
                return 'CONTROLLER';
            } else if (fileNameEndsWith === 'helper') {
                // HELPER — client-side helper
                return 'HELPER';
            } else if (fileNameEndsWith === 'renderer') {
                // RENDERER — client-side renderer
                return 'RENDERER';
            };
            break;
        case 'xml':
            return 'Metadata';
        default:
            throw `Unknown extension: ${extension} .`;
    }
    // Yet to be implemented
    // INTERFACE — interface definition
    // TOKENS — tokens collection
    // PROVIDER — reserved for future use
    // TESTSUITE — reserved for future use
    // MODEL — deprecated, do not use
}