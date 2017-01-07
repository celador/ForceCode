import * as vscode from 'vscode';
import * as parsers from './../parsers';
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
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));

    function getClassInfo(svc) {
        return vscode.window.forceCode.conn.tooling.sobject(toolingType)
            .find({ Name: name, NamespacePrefix: vscode.window.forceCode.config.prefix || '' }).execute();
    }

    function getTestMethods(info): string[] {
        if(info.SymbolTable){
            return info.SymbolTable.methods.filter(function (method) {
                return method.annotations.some(function (annotation) {
                    return annotation.name === 'IsTest';
                });
            }).map(function (method) {
                return method.name;
            });
        }else{
            error.outputError({ message: 'no symbol table'  }, vscode.window.forceCode.outputChannel);
        }
    }

    function runCurrentTests(results) {
        var info: any = results[0];
        var methodNames: string[] = getTestMethods(info);
        vscode.window.forceCode.statusBarItem.text = 'ForceCode: $(pulse) Running Unit Tests $(pulse)';
        return vscode.window.forceCode.conn.tooling.runUnitTests(info.Id, methodNames);
    }
    // =======================================================================================================================================

    function showResult(res) {
        return configuration().then(config => {
            vscode.window.forceCode.outputChannel.clear();
            if (res.failures.length > 0) {
                vscode.window.forceCode.outputChannel.appendLine('=========================================================   TEST FAILURES   ==========================================================');
                vscode.window.forceCode.statusBarItem.text = 'ForceCode: Some Tests Failed $(thumbsdown)';
            } else {
                vscode.window.forceCode.statusBarItem.text = 'ForceCode: All Tests Passed $(thumbsup)';
            }
            res.failures.forEach(function (failure) {
                var errorMessage: string = 'FAILED: ' + failure.stackTrace + '\n' + failure.message;
                vscode.window.forceCode.outputChannel.appendLine(errorMessage);
            });
            if (res.failures.length > 0) { vscode.window.forceCode.outputChannel.appendLine('======================================================================================================================================='); }
            res.successes.forEach(function (success) {
                var successMessage: string = 'SUCCESS: ' + success.name + ':' + success.methodName + ' - in ' + success.time + 'ms';
                vscode.window.forceCode.outputChannel.appendLine(successMessage);
            });

            if (res.codeCoverage.length > 0){
                res.codeCoverage.forEach(function(coverage ){
                    var linesOfCode = coverage.numLocations,
                        uncoveredLines = coverage.numLocationsNotCovered,
                        coveredLines = linesOfCode - uncoveredLines,
                        percentageCovered = Math.round((coveredLines / linesOfCode) * 100),
                        coverageMessage:  string = `Class: ${percentageCovered}% ${coverage.name} ${coveredLines} of ${linesOfCode} covered `;
                    
                    if(coverage.numLocationsNotCovered > 0){

                    }
                    
                    vscode.window.forceCode.outputChannel.appendLine(coverageMessage);
                })
                
            }

            if (res.codeCoverageWarnings.length > 0){
                res.codeCoverageWarnings.forEach(function(warning ){
                    var warningMessage:  string = 'CODE COVERAGE WARNING: ' + warning.message ;
                    vscode.window.forceCode.outputChannel.appendLine(warningMessage);
                })
                
            }

            vscode.window.forceCode.outputChannel.show();
            return res;
        });
    }

    // function onError(err): any {
    //     error.outputError(err, vscode.window.forceCode.outputChannel);
    //     return err;
    // }

    // =======================================================================================================================================
}
