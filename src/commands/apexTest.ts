import * as vscode from 'vscode';
import * as parsers from './../parsers';
import * as forceCode from './../forceCode';
import { configuration } from './../services';
import { QueryResult } from '../services/dxService';

export default async function apexTest(document: vscode.TextDocument, context: vscode.ExtensionContext): Promise<any> {    
    const toolingType: string = parsers.getToolingType(document);
    const name: string = parsers.getName(document, toolingType);
    if(!name.toLowerCase().includes('test'))
    {
        vscode.window.forceCode.statusBarItem.text = "ForceCode: Not a test class. Name must contain 'test'";
        vscode.window.forceCode.resetMenu();
        return Promise.reject({ message: 'Not a test class' });
    }

    if(vscode.window.forceCode.isBusy)
    {
        vscode.window.forceCode.commandQueue.push([apexTest, document, context]);
        return Promise.reject({ message: 'Already compiling or running unit tests' });
    }
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: $(pulse) Running Unit Tests $(pulse)';
    
    /* tslint:disable */
    var DefType: string = undefined;
    var Format: string = undefined;
    var Source: string = undefined;
    var currentObjectDefinition: any = undefined;
    var AuraDefinitionBundleId: string = undefined;
    var Id: string = undefined;
    /* tslint:enable */
    // Start doing stuff
    vscode.window.forceCode.testTimeout = 0;
    // remove test coverage stuff
    delete vscode.window.forceCode.codeCoverage;
    vscode.window.forceCode.codeCoverage = new Array();
    return startTest();

    async function startTest() {
        vscode.window.forceCode.isBusy = true;
        return await vscode.window.forceCode.dxCommands.runCommand('apex:test:run', '-n ' + name + ' -w 3 -y -r json')
            .then(dxRes => {
                if(dxRes) {
                    // build the query to only include files in the worspace

                    vscode.window.forceCode.dxCommands.toqlQuery(buildQuery())
                        .then(res => showResult(res, dxRes))
                        .then(showLog)
                        .then(endTest)
                        .catch(tryAgain);
                } else {
                    return tryAgain();
                }
            })
            .catch(tryAgain);
    }

    function tryAgain(err?) {
        vscode.window.forceCode.testTimeout++;
        console.log(vscode.window.forceCode.testTimeout);
        if(vscode.window.forceCode.testTimeout < 11) {
            return setTimeout(function() {
                console.log(vscode.window.forceCode.testTimeout);
                return startTest();
            }, 2000);
        } else {
            vscode.window.forceCode.statusBarItem.text = 'ForceCode: Failed to execute tests, wait at least a minute and try again.';
            return endTest(err);
        }
    }
    
    function endTest(err?) {
        if(err !== undefined) {
            vscode.window.forceCode.outputError(err, vscode.window.forceCode.outputChannel);
        }
        // end
        vscode.window.forceCode.isBusy = false;
        if(vscode.window.forceCode.commandQueue.length > 0)
        {
            var queue = vscode.window.forceCode.commandQueue.pop();
            return Promise.resolve(queue[0](queue[1], queue[2]));
        } else {
            vscode.window.forceCode.resetMenu();
            return Promise.resolve();
        }
    }

    // build the test result query
    function buildQuery(): string {
        var names: Array<string> = new Array<string>();
        let members: forceCode.IWorkspaceMember[] = vscode.window.forceCode.workspaceMembers;
        
        members.forEach(cur => {
            names.push(cur.name);
        });
        var orNamesString: string = "(ApexClassOrTrigger.Name = '" + names.join("' OR ApexClassOrTrigger.Name = '") + "') ";
        var query = 'SELECT Coverage, ApexClassOrTriggerId, ApexClassOrTrigger.Name, NumLinesCovered, NumLinesUncovered '
        + 'FROM ApexCodeCoverageAggregate '
        + 'WHERE ApexClassOrTriggerId != NULL '
        + 'AND ' + orNamesString
        + 'AND (NumLinesCovered > 0 OR NumLinesUncovered > 0) '
        + 'ORDER BY ApexClassOrTrigger.Name';
        console.log(query);
        return query;
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
            // Add Line Coverage information
            if (res.records) {
                res.records.forEach(function(curRes: forceCode.ICodeCoverage) {
                    let members: forceCode.IWorkspaceMember[] = vscode.window.forceCode.workspaceMembers;
                    let member: forceCode.IWorkspaceMember = members && members.reduce((prev, curr) => {
                        if (prev) { return prev; }
                        if(curr.name === curRes.ApexClassOrTrigger.Name && curRes.NumLinesUncovered === curRes.Coverage.uncoveredLines.length) {
                            vscode.window.forceCode.codeCoverage[curRes.ApexClassOrTriggerId] = curRes;
                            return curr;
                        }
                        return undefined;
                    }, undefined);
                });
            }

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
            var res: QueryResult = await vscode.window.forceCode.dxCommands.toqlQuery(queryString);
            return vscode.window.forceCode.dxCommands.getAndShowLog(res.records[0].Id);
        }
        return;
    }
    // =======================================================================================================================================
}
