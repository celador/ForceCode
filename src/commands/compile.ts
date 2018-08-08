import * as vscode from 'vscode';
import * as parsers from './../parsers';
import { IForceService } from './../forceCode';
import * as forceCode from './../forceCode';
import constants from './../models/constants';
import diff from './diff';
import { FCFile } from '../services/codeCovView';
import { codeCovViewService } from '../services';
const parseString: any = require('xml2js').parseString;

// TODO: Refactor some things out of this file.  It's getting too big.

const UPDATE: boolean = true;
const CREATE: boolean = false;

export default function compile(document: vscode.TextDocument, context: vscode.ExtensionContext): Promise<any> {
    if(!document) {
        return undefined;
    }
    var diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(document.fileName);
    var diagnostics: vscode.Diagnostic[] = [];
    const body: string = document.getText();
    const ext: string = parsers.getFileExtension(document);
    const toolingType: string = parsers.getToolingType(document);
    const fileName: string = parsers.getFileName(document);
    const name: string = parsers.getName(document, toolingType);
    var checkCount: number = 0;

    /* tslint:disable */
    var DefType: string = undefined;
    var Format: string = undefined;
    var Source: string = undefined;
    var currentObjectDefinition: any = undefined;
    /* tslint:enable */
    // Start doing stuff
    if (isMetadata(document) && toolingType === undefined) {
        // This process uses the Metadata API to deploy specific files
        // This is where we extend it to create any kind of metadata
        // Currently only Objects and Permission sets ...
        return Promise.resolve(vscode.window.forceCode)
            .then(createMetaData)
            .then(compileMetadata)
            .then(reportMetadataResults)
            .then(finished)
            .catch(onError);
    } else if (toolingType === undefined) {
        return Promise.reject({ message: 'Metadata Describe Error. Please try again.' })
    } else if (toolingType === 'AuraDefinition') {
        DefType = getAuraDefTypeFromDocument();
        Format = getAuraFormatFromDocument();
        Source = document.getText();
        // Aura Bundles are a special case, since they can be upserted with the Tooling API
        // Instead of needing to be compiled, like Classes and Pages..
        return Promise.resolve(vscode.window.forceCode)
            .then(getAuraBundle)
            .then(ensureAuraBundle)
            .then(bundle => {
                return getAuraDefinition(bundle)
                    .then(definitions => upsertAuraDefinition(definitions, bundle));
            })
            .then(finished)
            .catch(onError);
    } else {
        // This process uses the Tooling API to compile special files like Classes, Triggers, Pages, and Components
        return Promise.resolve(vscode.window.forceCode)
            .then(addToContainer)
            .then(requestCompile)
            .then(getCompileStatus)
            .then(finished)
            .then(containerFinished)
            .catch(onError);
    }

    // =======================================================================================================================================
    // ================================                  All Metadata                  ===========================================
    // =======================================================================================================================================
    function isMetadata(doc: vscode.TextDocument) {
        if (vscode.window.forceCode.describe && vscode.window.forceCode.describe.metadataObjects) {
            return getMetaType(doc) !== undefined;
        }
        return false;
    }
    function getMetaType(doc: vscode.TextDocument) {
        if (vscode.window.forceCode.describe && vscode.window.forceCode.describe.metadataObjects) {
            let extension: string = doc.fileName.slice(doc.fileName.lastIndexOf('.')).replace('.', '');
            let foo: any[] = vscode.window.forceCode.describe.metadataObjects.filter(o => {
                return o.suffix === extension;
            });
            if (foo.length) {
                return foo[0].xmlName;
            }
        }
    }

    function createMetaData() {
        let text: string = document.getText();

        return new Promise(function (resolve, reject) {
            parseString(text, { explicitArray: false, async: true }, function (err, result) {
                if (err) {
                    reject(err);
                }
                var metadata: any = result[getMetaType(document)];
                if (metadata) {
                    delete metadata['$'];
                    delete metadata['_'];
                    metadata.fullName = fileName;
                    resolve(metadata);
                }
                reject({ message: getMetaType(document) + ' metadata type not found in org' });
            });
        });
    }

    function compileMetadata(metadata) {
        return vscode.window.forceCode.conn.metadata.upsert(getMetaType(document), [metadata]);
    }

    function reportMetadataResults(result) {
        if (Array.isArray(result) && result.length && !result.some(i => !i.success)) {
            vscode.window.forceCode.showStatus('Successfully deployed ' + result[0].fullName);
            return result;
        } else if (Array.isArray(result) && result.length && result.some(i => !i.success)) {
            let error: string = result.filter(i => !i.success).map(i => i.fullName).join(', ') + ' Failed';
            vscode.window.showErrorMessage(error);
            throw { message: error };
        } else if (typeof result === 'object' && result.success) {
            vscode.window.forceCode.showStatus('Successfully deployed ' + result.fullName);
            return result;
        } else {
            var error: any = result.errors ? result.errors[0] : 'Unknown Error';
            vscode.window.showErrorMessage(error);
            throw { message: error };
        }
    }

    // =======================================================================================================================================
    // ================================                Lightning Components               ===========================================
    // =======================================================================================================================================
    function getAuraBundle() {
        return vscode.window.forceCode.conn.tooling.sobject('AuraDefinitionBundle').find({
            'DeveloperName': name, NamespacePrefix: vscode.window.forceCode.config.prefix || ''
        });
    }
    function ensureAuraBundle(results) {
        // If the Bundle doesn't exist, create it, else Do nothing
        if (results.length === 0 || !results[0]) {
            // Create Aura Definition Bundle
            return vscode.window.forceCode.conn.tooling.sobject('AuraDefinitionBundle').create({
                DeveloperName: name,
                MasterLabel: name,
                ApiVersion: vscode.window.forceCode.config.apiVersion || constants.API_VERSION,
                Description: name.replace('_', ' '),
            }).then(bundle => {
                results[0] = [bundle];
                return results;
            });
        } else {
            return results;
        }
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
        if (currentObjectDefinition !== undefined) {
            return vscode.window.forceCode.conn.tooling.sobject('AuraDefinition').update({ Id: currentObjectDefinition.Id, Source });
        } else if (bundle[0]) {
            return vscode.window.forceCode.conn.tooling.sobject('AuraDefinition').create({ AuraDefinitionBundleId: bundle[0].Id, DefType, Format, Source });
        }
        return undefined;
    }
    function getAuraDefTypeFromDocument() {
        var extension: string = ext.toLowerCase();
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
                var fileNameEndsWith: string = fileName.replace(name, '').toLowerCase();
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
    // =======================================================================================================================================
    // =================================  Tooling Objects (Class, Page, Component, Trigger)  =================================================
    // =======================================================================================================================================
    function addToContainer(svc: IForceService) {
        // We will push the filename on to the members array to make sure that the next time we compile, 
        var fc: IForceService = vscode.window.forceCode;
        var hasActiveContainer: Boolean = svc.containerId !== undefined;
        var fileIsOnlyMember: Boolean = (fc.containerMembers.length === 1) && fc.containerMembers.every(m => m.name === name);
        if (hasActiveContainer && fileIsOnlyMember) {
            // This is what happens when we had an error on the previous compile.  
            // We want to just update the member and try to compile again
            return updateMember(fc.containerMembers[0]);
        } else {
            // Otherwise, we create a new Container
            return svc.newContainer(true).then(() => {
                // Then Get the files info from the type, name, and prefix
                // Then Add the new member, updating the contents.
                return fc.conn.tooling.sobject(toolingType)
                    .find({ Name: fileName, NamespacePrefix: fc.config.prefix || '' }).execute()
                    .then(records => addMember(records));
            });
        }

        function updateMember(records) {
            var member: {} = {
                Body: body,
                Id: records.id,
            };
            return fc.conn.tooling.sobject(parsers.getToolingType(document, UPDATE)).update(member).then(() => {
                return fc;
            });
        }

        function shouldCompile(record) {
            const fcfile: FCFile = codeCovViewService.findById(record.Id);
            let mem: forceCode.IWorkspaceMember = fcfile ? fcfile.getWsMember() : undefined;
            if (mem && (!fcfile.compareDates(record.LastModifiedDate) || record.LastModifiedById !== mem.lastModifiedById)) {
                // throw up an alert
                return vscode.window.showWarningMessage('Someone else has changed this file!', 'Diff', 'Overwrite').then(s => {
                    if (s === 'Diff') {
                        diff(document);
                        return false;
                    }
                    if (s === 'Overwrite') {
                        return true;
                    }
                    return false;
                });
            } else {
                return Promise.resolve(true);
            }

        }
        function addMember(records) {
            if (records.length > 0) {
                // Tooling Object already exists
                //  UPDATE it
                var record: forceCode.MetadataResult = records[0];
                // Get the modified date of the local file... 
                var member: {} = {
                    Body: body,
                    ContentEntityId: record.Id,
                    Id: fc.containerId,
                    Metadata: record.Metadata,
                    MetadataContainerId: fc.containerId,
                };
                return shouldCompile(record).then(should => {
                    if (should) {
                        return fc.conn.tooling.sobject(parsers.getToolingType(document, UPDATE)).create(member).then(res => {
                            fc.containerMembers.push({ name, id: res.id });
                            return fc;
                        });
                    } else {
                        throw { message: record.Name + ' not saved' };
                    }
                });
            } else {
                // Results was 0, meaning...
                // Tooling Object does not exist
                // so we CREATE it
                return fc.conn.tooling.sobject(parsers.getToolingType(document, CREATE)).create(createObject(body)).then(foo => {
                    return fc.conn.tooling.sobject(toolingType).find({ Id: foo.id }, { Id: 1, CreatedDate: 1 }).execute().then(bar => {
                        // retrieve the last modified date here
                        var workspaceMember: forceCode.IWorkspaceMember = {
                            name: fileName,
                            path: document.fileName,
                            id: foo.id,
                            lastModifiedDate: bar[0].CreatedDate,
                            lastModifiedByName: '',
                            lastModifiedById: fc.dxCommands.orgInfo.userId,
                            type: toolingType,
                        };
                        codeCovViewService.addOrUpdateClass(workspaceMember);
                        codeCovViewService.saveClasses();
                        return fc;
                    });
                });
            }
        }

        function createObject(text: string): {} {
            if (toolingType === 'ApexClass') {
                return { Body: text };
            } else if (toolingType === 'ApexTrigger') {
                let matches: RegExpExecArray = /\btrigger\b\s\w*\s\bon\b\s(\w*)\s\(/.exec(text);
                if (matches) {
                    return { Body: text, TableEnumOrId: matches[1] };
                } else {
                    throw { message: 'Could not get object name from Trigger' };
                }
            } else if (toolingType === 'ApexPage' || toolingType === 'ApexComponent') {
                return {
                    Markup: text,
                    Masterlabel: name + 'Label',
                    Name: name,
                };
            }
            return { Body: text };
        }
    }
    // =======================================================================================================================================
    function requestCompile() {
        if(vscode.window.forceCode.containerMembers.length === 0) {
            return undefined;        // we don't need new container stuff on new file creation
        }
        return vscode.window.forceCode.conn.tooling.sobject('ContainerAsyncRequest').create({
            IsCheckOnly: false,
            IsRunTests: false,
            MetadataContainerId: vscode.window.forceCode.containerId,
        }).then(res => {
            vscode.window.forceCode.containerAsyncRequestId = res.id;
            return vscode.window.forceCode;
        });
    }
    // =======================================================================================================================================
    function getCompileStatus(): Promise<any> {
        if(vscode.window.forceCode.containerMembers.length === 0) {
            return Promise.resolve({});        // we don't need new container stuff on new file creation
        }
        return nextStatus();
        function nextStatus() {
            checkCount += 1;
            // Set a timeout to auto fail the compile after 60 seconds
            return getStatus().then(res => {
                if (isFinished(res)) {
                    checkCount = 0;
                    return res;
                } else if (checkCount > 30) {
                    checkCount = 0;
                    throw { message: fileName + ' timed out while saving. It might not be saved on the server.' };
                } else {
                    // Throttle the ReCheck of the compile status, to use fewer http requests (reduce effects on SFDC limits)
                    return new Promise(function (resolve) {
                        setTimeout(() => resolve(), vscode.window.forceCode.config.poll || 2000);
                      }).then(nextStatus);
                }
            });
        }
        function getStatus(): Promise<any> {
            return vscode.window.forceCode.conn.tooling.query(`SELECT Id, MetadataContainerId, MetadataContainerMemberId, State, IsCheckOnly, ` +
                `DeployDetails, ErrorMsg FROM ContainerAsyncRequest WHERE Id='${vscode.window.forceCode.containerAsyncRequestId}'`);
        }
        function isFinished(res) {
            // Here, we're checking whether the Container Async Request, is Queued, or in some other state 
            if (res.records && res.records[0]) {
                if (res.records.some(record => record.State === 'Queued')) {
                    return false;
                } else {
                    // Completed, Failed, Invalidated, Error, Aborted
                    return true;
                }
            }
            // If we don't have a container request, then we should stop.
            return true;
        }
    }
    // =======================================================================================================================================
    function finished(res: any): boolean {
        diagnosticCollection.set(document.uri, diagnostics);
        var failures: number = 0;
        if (res.records && res.records.length > 0) {
            res.records.filter(r => r.State !== 'Error').forEach(containerAsyncRequest => {
                containerAsyncRequest.DeployDetails.componentFailures.forEach(failure => {
                    if (failure.problemType === 'Error') {
                        vscode.window.showErrorMessage(failure.problem);
                        var failureRange: vscode.Range = document.lineAt(failure.lineNumber - 1).range;
                        if (failure.columnNumber - 1 >= 0) {
                            failureRange = failureRange.with(new vscode.Position((failure.lineNumber - 1), failure.columnNumber - 1));
                        }
                        diagnostics.push(new vscode.Diagnostic(failureRange, failure.problem, 0));
                        diagnosticCollection.set(document.uri, diagnostics);
                        failures++;
                    }
                });
            });
        } else if (res.errors && res.errors.length > 0) {
            // We got an error with the container
            res.errors.forEach(err => {
                console.error(err);
            });
            vscode.window.showErrorMessage(`There was an error while saving ${name}`);
        } else if (res.State === 'Error') {
            onError(res);
            vscode.window.showErrorMessage(`There was an error while saving ${name}. Check for syntax errors.`);
        }

        if(failures === 0) {
            // SUCCESS !!! 
            if(res.records && res.records[0].DeployDetails.componentSuccesses.length > 0) {
                const fcfile = codeCovViewService.findById(res.records[0].DeployDetails.componentSuccesses[0].id); 
                if(fcfile) {
                    var fcMem: forceCode.IWorkspaceMember = fcfile.getWsMember();
                    fcMem.lastModifiedDate = res.records[0].DeployDetails.componentSuccesses[0].createdDate;
                    fcMem.lastModifiedById = vscode.window.forceCode.dxCommands.orgInfo.userId;
                    codeCovViewService.addOrUpdateClass(fcMem);
                    codeCovViewService.saveClasses();
                }
            }
            vscode.window.forceCode.showStatus(`${name} ${DefType ? DefType : ''} $(check)`);
            return true;
        }
        return false;
    }
    function containerFinished(createNewContainer: boolean): any {
        // We got some records in our response
        return vscode.window.forceCode.newContainer(createNewContainer).then(() => {
            return Promise.resolve();
        });
    }
    
    function onError(err) {
        var errorMessage: string;
        if(err.message) {
            errorMessage = err.message;
            try {
                var errmess: string = err.message.split('Message:')[1].split(': Source')[0];
                var linCol: string[] = err.message.split(':')[1].split(',');
                var failureLineNumber: number = Number.parseInt(linCol[0]);
                var failureColumnNumber: number = Number.parseInt(linCol[1]);
                var failureRange: vscode.Range = document.lineAt(failureLineNumber - 1).range;
                if (failureColumnNumber - 1 >= 0) {
                    failureRange = failureRange.with(new vscode.Position((failureLineNumber - 1), failureColumnNumber));
                }
                diagnostics.push(new vscode.Diagnostic(failureRange, errmess, 0));
                diagnosticCollection.set(document.uri, diagnostics);
                errorMessage = errmess;
            } catch (e) {}
        } else {
            errorMessage = err;
        }
        vscode.window.showErrorMessage(errorMessage);
    }
}
