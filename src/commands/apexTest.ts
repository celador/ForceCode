import * as vscode from 'vscode';
import * as parsers from './../parsers';
import * as forceCode from './../forceCode';
// import jsforce = require('jsforce');
// import Workspace from './../services/workspace';
import * as error from './../util/error';
import { configuration } from './../services';

export default function apexTest(document: vscode.TextDocument, context: vscode.ExtensionContext): Promise<any> {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: $(pulse) Running Unit Tests $(pulse)';

    // const body: string = document.getText();
    // const ext: string = parsers.getFileExtension(document);
    const toolingType: string = parsers.getToolingType(document);
    // const fileName: string = parsers.getFileName(document);
    const name: string = parsers.getName(document, toolingType);
    /* tslint:disable */
    var DefType: string = undefined;
    var Format: string = undefined;
    var Source: string = undefined;
    var currentObjectDefinition: any = undefined;
    var AuraDefinitionBundleId: string = undefined;
    var Id: string = undefined;
    /* tslint:enable */
    // Start doing stuff
    return vscode.window.forceCode.connect(context)
        .then(svc => getClassInfo(svc))
        .then(id => runCurrentTests(id))
        .then(showResult)
        .then(showLog)
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));

    function getClassInfo(svc) {
        return vscode.window.forceCode.conn.tooling.sobject(toolingType)
            .find({ Name: name, NamespacePrefix: vscode.window.forceCode.config.prefix || '' }).execute();
    }

    function selectionContainsMethod(method) {
        return vscode.window.activeTextEditor.selections.some(function (selection) {
            return document.getText(new vscode.Range(selection.start, selection.end)).indexOf(method.name) > -1;
        });
    }

    function getTestMethods(info): string[] {
        if (info.SymbolTable) {
            var testMethods: any[] = info.SymbolTable.methods.filter(function (method) {
                return method.annotations.some(function (annotation) {
                    return annotation.name === 'IsTest';
                });
            });
            var selectionsContainsMethodNames: boolean = testMethods.some(selectionContainsMethod);
            if (selectionsContainsMethodNames) {
                testMethods = testMethods.filter(selectionContainsMethod);
            }
            return testMethods.map(function (method) {
                return method.name;
            });
        } else {
            error.outputError({ message: 'no symbol table' }, vscode.window.forceCode.outputChannel);
        }
    }

    function runCurrentTests(results) {
        var info: any = results[0];
        var methodNames: string[] = getTestMethods(info);
        vscode.window.forceCode.statusBarItem.text = 'ForceCode: $(pulse) Running Unit Tests $(pulse)';
        // return vscode.window.forceCode.conn.tooling.runUnitTests(info.Id, methodNames);
    }
    // =======================================================================================================================================
    function showResult(res) {
        return configuration().then(results => {
            vscode.window.forceCode.outputChannel.clear();
            if (res.failures.length) {
                vscode.window.forceCode.outputChannel.appendLine('=========================================================   TEST FAILURES   ==========================================================');
                vscode.window.forceCode.statusBarItem.text = 'ForceCode: Some Tests Failed $(thumbsdown)';
            } else {
                vscode.window.forceCode.statusBarItem.text = 'ForceCode: All Tests Passed $(thumbsup)';
            }
            let diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('Test Failures');
            res.successes.forEach(function (success) {
                let members: forceCode.IWorkspaceMember[] = vscode.window.forceCode.workspaceMembers;
                let member: forceCode.IWorkspaceMember = members && members.reduce((prev, curr) => {
                    if (prev) { return prev; }
                    return curr.name === success.name ? curr : undefined;
                }, undefined);
                if (member) {
                    let docUri: vscode.Uri = vscode.Uri.file(member.path);
                    let diagnostics: vscode.Diagnostic[] = [];
                    diagnosticCollection.set(docUri, diagnostics);
                }
            });
            res.failures.forEach(function (failure) {
                let re: RegExp = /^(Class|Trigger)\.\S*\.(\S*)\.(\S*)\:\sline\s(\d*)\,\scolumn\s(\d*)$/ig;
                let matches: string[] = re.exec(failure.stackTrace);
                if (matches && matches.length && matches.length === 6) {
                    // let typ: string = matches[1];
                    let cls: string = matches[2];
                    // let method: string = matches[3];
                    let lin: number = +matches[4];
                    let _lin: number = lin > 0 ? lin - 1 : 0;
                    let col: number = +matches[5];
                    // get URI of document from class name and workspace path
                    let members: forceCode.IWorkspaceMember[] = vscode.window.forceCode.workspaceMembers;
                    let member: forceCode.IWorkspaceMember = members && members.reduce((prev, curr) => {
                        if (prev) { return prev; }
                        return curr.name === cls ? curr : undefined;
                    }, undefined);
                    if (member) {
                        let docUri: vscode.Uri = vscode.Uri.file(member.path);
                        let docLocation: vscode.Location = new vscode.Location(docUri, new vscode.Position(_lin, col));
                        let failureRange: vscode.Range = docLocation.range.with(new vscode.Position(_lin, Number.MAX_VALUE));
                        let diagnostics: vscode.Diagnostic[] = [];
                        if (diagnosticCollection.has(docUri)) {
                            let ds: vscode.Diagnostic[] = diagnosticCollection.get(docUri);
                            diagnostics = diagnostics.concat(ds);
                        }
                        let diagnostic: vscode.Diagnostic = new vscode.Diagnostic(failureRange, failure.message, vscode.DiagnosticSeverity.Information);
                        diagnostics.push(diagnostic);
                        diagnosticCollection.set(docUri, diagnostics);
                    }
                }
                let errorMessage: string = 'FAILED: ' + failure.stackTrace + '\n' + failure.message;
                vscode.window.forceCode.outputChannel.appendLine(errorMessage);
            });
            if (res.failures.length) { vscode.window.forceCode.outputChannel.appendLine('======================================================================================================================================='); }
            res.successes.forEach(function (success) {
                var successMessage: string = 'SUCCESS: ' + success.name + ':' + success.methodName + ' - in ' + success.time + 'ms';
                vscode.window.forceCode.outputChannel.appendLine(successMessage);
            });
            // Add Line Coverage information
            if (res.codeCoverage.length) {
                res.codeCoverage.forEach(function (coverage) {
                    vscode.window.forceCode.codeCoverage[coverage.id] = coverage;
                });
            }

            // Add Code Coverage Warnings, maybe as actual Validation Warnings 
            if (res.codeCoverageWarnings.length && Array.isArray(vscode.window.forceCode.workspaceMembers) && vscode.window.forceCode.workspaceMembers.length) {
                res.codeCoverageWarnings.forEach(function (warning) {

                    let member: forceCode.IWorkspaceMember = vscode.window.forceCode.workspaceMembers.reduce((prev, curr) => {
                        let coverage: any = vscode.window.forceCode.codeCoverage[warning.id];
                        if (curr.name === coverage.name && curr.memberInfo && curr.memberInfo.type && curr.memberInfo.type.indexOf(coverage.type) >= 0) {
                            return curr;
                        } else if (prev) {
                            return prev;
                        }
                    }, undefined);

                    if (member) {
                        let diagnosticCollection2: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(member.memberInfo.type);
                        let diagnostics: vscode.Diagnostic[] = [];
                        let warningMessage: string = warning.message;
                        let docUri: vscode.Uri = vscode.Uri.file(member.path);
                        let docLocation: vscode.Location = new vscode.Location(docUri, new vscode.Position(0, 0));
                        diagnostics.push(new vscode.Diagnostic(docLocation.range, warningMessage, 1));
                        diagnosticCollection2.set(docUri, diagnostics);
                    } else if (warning.message) {
                        vscode.window.forceCode.outputChannel.appendLine(warning.message);
                    }

                });
            }
            return res;
        });
    }
    function showLog(res) {
        if (vscode.window.forceCode.config.showTestLog) {
            return vscode.workspace.openTextDocument(vscode.Uri.parse(`sflog://salesforce.com/${res.apexLogId}.log?q=${new Date()}`)).then(function (_document: vscode.TextDocument) {
                return vscode.window.showTextDocument(_document, 3, true);
            });
        }
        return res;
    }
    // =======================================================================================================================================
}
