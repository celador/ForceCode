import * as vscode from 'vscode';
import * as parsers from './../parsers';
import * as forceCode from './../forceCode';
import { configuration } from './../services';
import { QueryResult } from '../services/dxService';
import apexTestResults from '../services/apexTestResults';

export function apexTestClass(testClass: string): Promise<any> {
    return Promise.resolve(apexTest(testClass, 'class'));
}

export function apexTestMethod(testMethod: string): Promise<any> {
    return Promise.resolve(apexTest(testMethod, 'method'));
}

async function apexTest(toTest: string, classOrMethod: string): Promise<any> {    
    if(vscode.window.forceCode.isBusy)
    {
        vscode.window.forceCode.commandQueue.push([apexTest, toTest, classOrMethod]);
        return Promise.reject({ message: 'Already compiling or running unit tests' });
    }
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: $(pulse) Running Unit Tests $(pulse)';
    var name = toTest.split('.')[0];
    
    // Start doing stuff
    // remove test coverage stuff
    vscode.window.forceCode.isBusy = true;
    var toRun: string;
    if(classOrMethod === 'class') {
        toRun = '-n ' + toTest;
    } else {
        toRun = '-t ' + toTest;
    }
    return await vscode.window.forceCode.dxCommands.runCommand('apex:test:run', toRun + ' -w 3 -y -r json')
        .then(dxRes => {
                // get the test class Ids from the result
                var testClassIds: string[] = new Array<string>();
                dxRes.tests.forEach(tRes => {
                    testClassIds.push(tRes.ApexClass.Id);
                });

                return apexTestResults(testClassIds)
                    .then(res => showResult(res, dxRes))
                    .then(showLog)
                    .then(endTest)
                    .catch(showFail);
        });

    function showFail(err?) {
        vscode.window.forceCode.statusBarItem.text = 'ForceCode: Failed to execute tests, wait at least a minute and try again.';
        return endTest(err);
    }
    
    function endTest(err?) {
        if(err !== undefined) {
            vscode.window.forceCode.outputError(err, vscode.window.forceCode.outputChannel);
        }
        // end
        vscode.window.forceCode.isBusy = false;
        if(vscode.window.forceCode.commandQueue.length > 0)
        {
            var queue = vscode.window.forceCode.commandQueue.shift();
            return Promise.resolve(queue[0](queue[1], queue[2]));
        } else {
            vscode.window.forceCode.resetMenu();
            return Promise.resolve();
        }
    }

    // =======================================================================================================================================
    function showResult(res: QueryResult, dxRes) {
        return configuration().then(results => {
            vscode.window.forceCode.outputChannel.clear();
            let diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('Test Failures');
            if (dxRes.summary.failing && dxRes.summary.failing > 0) {
                vscode.window.forceCode.outputChannel.appendLine('=========================================================   TEST FAILURES   ==========================================================');
                vscode.window.forceCode.statusBarItem.text = 'ForceCode: Some Tests Failed $(thumbsdown)';
                let re: RegExp = /^(Class|Trigger)\.\S*\.(\S*)\.(\S*)\:\sline\s(\d*)\,\scolumn\s(\d*)$/ig;
                let matches: string[] = re.exec(dxRes.tests[0].StackTrace);
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
                        return curr.name === name ? curr : undefined;
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
                        let diagnostic: vscode.Diagnostic = new vscode.Diagnostic(failureRange, dxRes.tests[0].Message, vscode.DiagnosticSeverity.Information);
                        diagnostics.push(diagnostic);
                        diagnosticCollection.set(docUri, diagnostics);
                    }
                }
                let errorMessage: string = 'FAILED: ' + dxRes.tests[0].StackTrace + '\n' + dxRes.tests[0].Message;
                vscode.window.forceCode.outputChannel.appendLine(errorMessage);
                vscode.window.forceCode.outputChannel.appendLine('=======================================================================================================================================');
            } else {
                vscode.window.forceCode.statusBarItem.text = 'ForceCode: All Tests Passed $(thumbsup)';
                let members: forceCode.IWorkspaceMember[] = vscode.window.forceCode.workspaceMembers;
                let member: forceCode.IWorkspaceMember = members && members.reduce((prev, curr) => {
                    if (prev) { return prev; }
                    return curr.name === name ? curr : undefined;
                }, undefined);
                if (member) {
                    let docUri: vscode.Uri = vscode.Uri.file(member.path);
                    let diagnostics: vscode.Diagnostic[] = [];
                    diagnosticCollection.set(docUri, diagnostics);
                }
                var successMessage: string = 'SUCCESS: ' + name + ':' + dxRes.tests[0].MethodName + ' - in ' + dxRes.summary.testExecutionTime;
                vscode.window.forceCode.outputChannel.appendLine(successMessage);
            }
            vscode.window.forceCode.resetMenu();

            return dxRes;
        });
    }
    async function showLog(dxRes) {
        if (vscode.window.forceCode.config.showTestLog) {
            var queryString: string = `SELECT Id FROM ApexLog` +
                ` WHERE LogUserId IN (SELECT Id FROM User WHERE UserName='${vscode.window.forceCode.config.username}')` +
                // ` AND Request = 'API' AND Location = 'SystemLog'` +
                // ` AND Operation like '%executeAnonymous%'`
                ` ORDER BY StartTime DESC, Id DESC LIMIT 1`;
            var res: QueryResult = await vscode.window.forceCode.conn.tooling.query(queryString);
            vscode.window.forceCode.dxCommands.getAndShowLog(res.records[0].Id);
        }
        return;
    }
    // =======================================================================================================================================
}
