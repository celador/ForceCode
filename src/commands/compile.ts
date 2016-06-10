import * as vscode from 'vscode';
import * as parsers from './../parsers';
import {constants} from './../services';
import {IForceService} from './../forceCode';
const UPDATE: boolean = true;
const CREATE: boolean = false;
var service: IForceService;
var outputChannel: vscode.OutputChannel;

export default function compile(document: vscode.TextDocument, context: vscode.ExtensionContext): Thenable<any> {
    'use strict';
    vscode.window.setStatusBarMessage('ForceCode: Compiling...');
    service = <IForceService>context.workspaceState.get(constants.FORCE_SERVICE);
    outputChannel = <vscode.OutputChannel>context.workspaceState.get(constants.OUTPUT_CHANNEL);

    const body: string = document.getText();
    const toolingType: string = parsers.getToolingType(document);
    if (toolingType === undefined) {
        return Promise
            .reject({ message: 'Unknown Tooling Type.  Ensure the body is well formed' })
            .catch(onError);
    }
    const name: string = parsers.getName(document, toolingType);
    return service.connect(context)
        .then(svc => svc.newContainer())
        .then(addToContainer)
        .then(requestCompile)
        .then(getCompileStatus)
        .then(finished, onError);
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function addToContainer() {
        return service.conn.tooling.sobject(toolingType)
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
                    Id: service.containerId,
                    Metadata: record.Metadata,
                    MetadataContainerId: service.containerId,
                };
                // outputChannel.appendLine('ForceCode: Updating ' + name);
                vscode.window.setStatusBarMessage('ForceCode: Updating ' + name);
                return service.conn.tooling.sobject(parsers.getToolingType(document, UPDATE)).create(member).then(res => {
                    return service;
                });
            } else {
                // Tooling Object does not exist
                // CREATE it
                // outputChannel.appendLine('ForceCode: Creating ' + name);
                vscode.window.setStatusBarMessage('ForceCode: Creating ' + name);
                return service.conn.tooling.sobject(parsers.getToolingType(document, CREATE)).create(createObject(body)).then(foo => {
                    return service;
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
        return service.conn.tooling.sobject('ContainerAsyncRequest').create({
            IsCheckOnly: false,
            IsRunTests: false,
            MetadataContainerId: service.containerId,
        }).then(res => {
            service.containerAsyncRequestId = res.id;
            return service;
        });
    }
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function getCompileStatus() {
        var checkCount: number = 0;
        return new Promise(
            function (resolve, reject) {
                // Recursively get the status of the container, using promises
                nextStatus();
                function nextStatus() {
                    checkCount += 1;
                    vscode.window.setStatusBarMessage('ForceCode: Get Status...' + checkCount);
                    return getStatus().then(res => {
                        // Throttle the ReCheck of the compile status, to use fewer http requests (reduce effects on SFDC limits)
                        isFinished(res) ? resolve(res) : setTimeout(() => nextStatus(), 300);
                    });
                }
                // Set a timeout to auto fail the compile after 30 seconds
                setTimeout(function () {
                    reject();
                }, 30000);
            });
        function getStatus() {
            return service.conn.tooling.query(`SELECT Id, MetadataContainerId, MetadataContainerMemberId, State, IsCheckOnly, ` +
                `DeployDetails, ErrorMsg FROM ContainerAsyncRequest WHERE Id='${service.containerAsyncRequestId}'`);
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
        res.records.forEach(containerAsyncRequest => {
            containerAsyncRequest.DeployDetails.componentFailures.forEach(failure => {
                if (failure.problemType === 'Error') {
                    var failureRange: vscode.Range = document.lineAt(failure.lineNumber - 1).range;
                    if (failure.columnNumber > 0) {
                        failureRange = failureRange.with(new vscode.Position((failure.lineNumber - 1), failure.columnNumber));
                    }
                    diagnostics.push(new vscode.Diagnostic(failureRange, failure.problem, failure.problemType));
                }
            });
            diagnosticCollection.set(document.uri, diagnostics);
        });
        // TODO: Make the Success message derive from the componentSuccesses, maybe similar to above code for failures
        if (diagnostics.length > 0) {
            vscode.window.setStatusBarMessage(`ForceCode: Compile Errors!`);
        } else {
            vscode.window.setStatusBarMessage(`ForceCode: Compile/Deploy of ${name} was successful`);
            // vscode.commands.executeCommand('workbench.action.output.toggleOutput');
            // outputChannel.hide();
        }
        return true;
    }
    // =======================================================================================================================================
    function onError(err): boolean {
        vscode.window.setStatusBarMessage('ForceCode: ' + err.message);
        outputChannel.appendLine('================================     ERROR     ================================\n');
        outputChannel.appendLine(err.message);
        console.log(err);
        return false;
    }
    // =======================================================================================================================================
}
