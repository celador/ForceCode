import * as vscode from 'vscode';
import * as parsers from './../parsers';
import * as forceCode from './../forceCode';
import { codeCovViewService, switchUserViewService } from '../services';
import { saveAura, getAuraDefTypeFromDocument } from './saveAura';
import { saveApex } from './saveApex';
import { getAnyTTFromFolder } from '../parsers/open';
const parseString: any = require('xml2js').parseString;

export default function compile(document: vscode.TextDocument): Promise<any> {
    if(!document) {
        return Promise.resolve();
    }
    
    var diagnosticCollection: vscode.DiagnosticCollection = vscode.window.forceCode.fcDiagnosticCollection;
    diagnosticCollection.delete(document.uri);
    var diagnostics: vscode.Diagnostic[] = [];
    var exDiagnostics: vscode.Diagnostic[] = vscode.languages.getDiagnostics(document.uri);
    
    const toolingType: string = parsers.getToolingType(document);
    const fileName: string = parsers.getFileName(document);
    const name: string = parsers.getName(document, toolingType);

    var DefType: string = undefined;
    var Metadata: {} = undefined;

    if(document.fileName.endsWith('-meta.xml')) {
        parseString(document.getText(), { explicitArray: false }, function (err, dom) {
            if (err) { 
                return undefined; 
            } else {
                const metadataType: string = Object.keys(dom)[0];
                delete dom[metadataType].$;
                Metadata =  dom[metadataType];
            }
        });
    }

    // Start doing stuff
    if (getAnyTTFromFolder(document.uri) && toolingType === undefined) {
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
        DefType = getAuraDefTypeFromDocument(document);
        return saveAura(document, toolingType, Metadata)
                .then(finished)
                .catch(onError);
    } else {
        // This process uses the Tooling API to compile special files like Classes, Triggers, Pages, and Components
        return saveApex(document, toolingType, Metadata)
            .then(finished)
            .then(vscode.window.forceCode.newContainer)
            .catch(onError);
    }

    // =======================================================================================================================================
    // ================================                  All Metadata                  ===========================================
    // =======================================================================================================================================

    function createMetaData() {
        let text: string = document.getText();

        return new Promise(function (resolve, reject) {
            parseString(text, { explicitArray: false, async: true }, function (err, result) {
                if (err) {
                    reject(err);
                }
                var metadata: any = result[getAnyTTFromFolder(document.uri)];
                if (metadata) {
                    delete metadata['$'];
                    delete metadata['_'];
                    metadata.fullName = fileName;
                    resolve(metadata);
                }
                reject({ message: getAnyTTFromFolder(document.uri) + ' metadata type not found in org' });
            });
        });
    }

    function compileMetadata(metadata) {
        return vscode.window.forceCode.conn.metadata.upsert(getAnyTTFromFolder(document.uri), [metadata]);
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
    function finished(res: any): boolean {
        if(vscode.window.forceCode.dxCommands.isEmptyUndOrNull(res)) {
            vscode.window.forceCode.showStatus(`${name} ${DefType ? DefType : ''} $(check)`);
            return true;
        }
        var failures: number = 0;
        if (res.records && res.records.length > 0) {
            res.records.filter(r => r.State !== 'Error').forEach(containerAsyncRequest => {
                containerAsyncRequest.DeployDetails.componentFailures.forEach(failure => {
                    if (failure.problemType === 'Error') {
                        var failureRange: vscode.Range = document.lineAt(failure.lineNumber - 1).range;
                        if (failure.columnNumber - 1 >= 0) {
                            failureRange = failureRange.with(new vscode.Position((failure.lineNumber - 1), failure.columnNumber - 1));
                        }
                        if(!exDiagnostics.find(exDia => { return exDia.message === failure.problem;})) {
                            diagnostics.push(new vscode.Diagnostic(failureRange, failure.problem, 0));
                            diagnosticCollection.set(document.uri, diagnostics);
                        }
                        failures++;
                    }
                });
            });
        } else if (res.errors && res.errors.length > 0) {
            // We got an error with the container
            res.errors.forEach(err => {
                onError(err);
                failures++;
            });
        } else if (res.State === 'Error') {
            onError(res);
            failures++;
        }

        if(failures === 0 && !vscode.window.forceCode.dxCommands.isEmptyUndOrNull(res)) {
            // SUCCESS !!! 
            if(res.records && res.records[0].DeployDetails.componentSuccesses.length > 0) {
                const fcfile = codeCovViewService.findById(res.records[0].DeployDetails.componentSuccesses[0].id); 
                if(fcfile) {
                    var fcMem: forceCode.IWorkspaceMember = fcfile.getWsMember();
                    fcMem.coverage = undefined;
                    fcMem.lastModifiedDate = res.records[0].DeployDetails.componentSuccesses[0].createdDate;
                    fcMem.lastModifiedById = switchUserViewService.orgInfo.userId;
                    fcfile.updateWsMember(fcMem);
                }
            }
            vscode.window.forceCode.showStatus(`${name} ${DefType ? DefType : ''} $(check)`);
            return true;
        }
        return false;
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
                if(!exDiagnostics.find(exDia => { return exDia.message === errmess;})) {
                    diagnostics.push(new vscode.Diagnostic(failureRange, errmess, 0));
                    diagnosticCollection.set(document.uri, diagnostics);
                }
            } catch (e) { vscode.window.showErrorMessage(errorMessage); }
        } else {
            errorMessage = err;
            vscode.window.showErrorMessage(errorMessage);
        }
    }
}
