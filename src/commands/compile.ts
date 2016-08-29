import * as vscode from 'vscode';
import * as parsers from './../parsers';
import sleep from './../util/sleep';
import * as error from './../util/error';
// import {constants} from './../services';
const UPDATE: boolean = true;
const CREATE: boolean = false;

export default function compile(document: vscode.TextDocument, context: vscode.ExtensionContext): Promise<any> {
    'use strict';
    vscode.window.setStatusBarMessage('ForceCode: Compiling...');

    const body: string = document.getText();
    const ext: string = parsers.getFileExtension(document);
    const toolingType: string = parsers.getToolingType(document);
    const fileName: string = parsers.getFileName(document);
    const name: string = parsers.getName(document, toolingType);
    // To be defined further down`
    var DefType: string = undefined;
    var Format: string = undefined;
    var Source: string = undefined;
    var currentObjectDefinition: any = undefined;
    var AuraDefinitionBundleId: string = undefined;
    var Id: string = undefined;
    // Start doing stuff
    if (toolingType === undefined) {
        return Promise
            .reject({ message: 'Unknown Tooling Type.  Ensure the body is well formed' })
            .catch(onError);
    } else if (toolingType === 'AuraDefinition') {
        DefType = getAuraDefTypeFromDocument(document);
        Format = getAuraFormatFromDocument(document);
        Source = document.getText();
        return vscode.window.forceCode.connect(context)
            .then(svc => getAuraDefinition(svc))
            .then(results => upsertAuraDefinition(results))
            .then(finished, onError);
    } else {
        return vscode.window.forceCode.connect(context)
            .then(svc => svc.newContainer())
            .then(addToContainer)
            .then(requestCompile)
            .then(getCompileStatus)
            .then(finished, onError);
    }
    // =======================================================================================================================================
    // ================================                Lightning Components               ===========================================
    // =======================================================================================================================================
    function getAuraDefinition(svc) {
        return vscode.window.forceCode.conn.tooling.sobject('AuraDefinition').find({
            'AuraDefinitionBundle.DeveloperName': name
        });
    }
    function upsertAuraDefinition(results) {
        if (results.length > 0) {
            var def: any[] = results.filter(result => result.DefType === DefType);
            currentObjectDefinition = def.length > 0 ? def[0] : undefined;
            if (currentObjectDefinition !== undefined) {
                AuraDefinitionBundleId = currentObjectDefinition.AuraDefinitionBundleId;
                Id = currentObjectDefinition.Id;
                return vscode.window.forceCode.conn.tooling.sobject('AuraDefinition').update({ Id: currentObjectDefinition.Id, Source });
            } else {
                return vscode.window.forceCode.conn.tooling.sobject('AuraDefinitionBundle').find({
                    'DeveloperName': name
                }).then(bundles => {
                    if (bundles.length > 0) {
                        return vscode.window.forceCode.conn.tooling.sobject('AuraDefinition').create({ AuraDefinitionBundleId: results[0].AuraDefinitionBundleId, DefType, Format, Source });
                    }
                    throw { message: 'Bundle not yet created' };
                });
            }
        }
    }
    function getAuraDefTypeFromDocument(doc: vscode.TextDocument) {
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
    function getAuraFormatFromDocument(doc: vscode.TextDocument) {
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
    // =======================================================================================================================================
    // =======================================================================================================================================

    function addToContainer() {
        return vscode.window.forceCode.conn.tooling.sobject(toolingType)
            .find({ Name: name }).execute()
            .then(records => addMember(records));
        function addMember(records) {
            if (records.length > 0) {
                // Tooling Object already exists
                //  UPDATE it
                var record: { Id: string, Metadata: {} } = records[0];
                var member: {} = {
                    Body: body,
                    ContentEntityId: record.Id,
                    Id: vscode.window.forceCode.containerId,
                    Metadata: record.Metadata,
                    MetadataContainerId: vscode.window.forceCode.containerId,
                };
                // outputChannel.appendLine('ForceCode: Updating ' + name);
                vscode.window.setStatusBarMessage('ForceCode: Updating ' + name);
                return vscode.window.forceCode.conn.tooling.sobject(parsers.getToolingType(document, UPDATE)).create(member).then(res => {
                    return vscode.window.forceCode;
                });
            } else {
                // Tooling Object does not exist
                // CREATE it
                // outputChannel.appendLine('ForceCode: Creating ' + name);
                vscode.window.setStatusBarMessage('ForceCode: Creating ' + name);
                return vscode.window.forceCode.conn.tooling.sobject(parsers.getToolingType(document, CREATE)).create(createObject(body)).then(foo => {
                    return vscode.window.forceCode;
                });
            }
        }
        function createObject(text: string): {} {
            if (toolingType === 'ApexClass') {
                return { Body: text };
            } else if (toolingType === 'ApexPage') {
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
    // =======================================================================================================================================
    // =======================================================================================================================================
    function requestCompile() {
        vscode.window.setStatusBarMessage('ForceCode: Compile Requested');
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
    // =======================================================================================================================================
    // =======================================================================================================================================
    function getCompileStatus() {
        var checkCount: number = 0;
        return nextStatus();
        function nextStatus() {
            checkCount += 1;
            // Set a timeout to auto fail the compile after 30 seconds
            vscode.window.setStatusBarMessage('ForceCode: Get Status...' + checkCount);
            return getStatus().then(res => {
                // Throttle the ReCheck of the compile status, to use fewer http requests (reduce effects on SFDC limits)
                if (isFinished(res)) {
                    return res;
                } else if (checkCount > 30) {
                    throw 'Timeout';
                } else {
                    return sleep(1000).then(nextStatus);
                }
            });
        }
        function getStatus() {
            return vscode.window.forceCode.conn.tooling.query(`SELECT Id, MetadataContainerId, MetadataContainerMemberId, State, IsCheckOnly, ` +
                `DeployDetails, ErrorMsg FROM ContainerAsyncRequest WHERE Id='${vscode.window.forceCode.containerAsyncRequestId}'`);
        }
        function isFinished(res) {
            if (res.records && res.records[0]) {
                if (res.records.some(record => record.State === 'Queued')) {
                    return false;
                } else {
                    // Completed, Failed, Invalidated, Error, Aborted
                    return true;
                }
            }
            return true;
        }
    }
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function finished(res): boolean {
        // Create a diagnostic Collection for the current file.  Overwriting the last...
        var diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(document.fileName);
        var diagnostics: vscode.Diagnostic[] = [];
        if (res.records && res.records.length > 0) {
            res.records.forEach(containerAsyncRequest => {
                containerAsyncRequest.DeployDetails.componentFailures.forEach(failure => {
                    if (failure.problemType === 'Error') {
                        var failureLineNumber: number = failure.lineNumber || failure.LineNumber || 1;
                        var failureRange: vscode.Range = document.lineAt(failureLineNumber - 1).range;
                        if (failure.columnNumber > 0) {
                            failureRange = failureRange.with(new vscode.Position((failureLineNumber - 1), failure.columnNumber));
                        }
                        diagnostics.push(new vscode.Diagnostic(failureRange, failure.problem, failure.problemType));
                    }
                });
            });
        } else if (res.errors && res.errors.length > 0) {
            res.errors.forEach(err => {
                console.error(err);
            });
            vscode.window.setStatusBarMessage(`ForceCode: Compile Errors!`);
        }
        // TODO: Make the Success message derive from the componentSuccesses, maybe similar to above code for failures
        if (diagnostics.length > 0) {
            vscode.window.setStatusBarMessage(`ForceCode: Compile Errors!`);
        } else {
            vscode.window.setStatusBarMessage(`ForceCode: Compile/Deploy of ${name} ${DefType ? DefType : ''} was successful`);
            // vscode.commands.executeCommand('workbench.action.output.toggleOutput');
            // outputChannel.hide();
        }
        diagnosticCollection.set(document.uri, diagnostics);
        return true;
    }
    // =======================================================================================================================================
    function onError(err): boolean {
        if (toolingType === '   ') {
            var diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(document.fileName);
            var diagnostics: vscode.Diagnostic[] = [];
            var splitString = err.message.split(fileName + ':');
            var partTwo = splitString.length > 1 ? splitString[1] : '1,1:Unknown error';
            var idx = partTwo.indexOf(':');
            var rangeArray = partTwo.substring(0, idx).split(',');
            var errorMessage = partTwo.substring(idx);
            var failureLineNumber: number = rangeArray[0];
            var failureColumnNumber: number = rangeArray[1];
            var failureRange: vscode.Range = document.lineAt(failureLineNumber - 1).range;
            if (failureColumnNumber > 0) {
                failureRange = failureRange.with(new vscode.Position((failureLineNumber - 1), failureColumnNumber));
            }
            diagnostics.push(new vscode.Diagnostic(failureRange, errorMessage, 0));
            diagnosticCollection.set(document.uri, diagnostics);

            error.outputError(err, vscode.window.forceCode.outputChannel);
            return false;
        } else {
            error.outputError(err, vscode.window.forceCode.outputChannel);
        }
    }
    // =======================================================================================================================================
}
