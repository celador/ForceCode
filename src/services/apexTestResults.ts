import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import { QueryResult } from '../services/dxService';

export default function getApexTestResults(testClassIds?: string[]): Promise<QueryResult> {
    if(!testClassIds) {
        vscode.window.forceCode.statusBarItem.text = 'ForceCode: Retrieving current code coverage data...';
    }

    let members: forceCode.IWorkspaceMember[] = vscode.window.forceCode.workspaceMembers;
    var memberIds: string[] = new Array<string>();
    var fromWhere: string = testClassIds ? ' ApexCodeCoverage ' : ' ApexCodeCoverageAggregate ';
    
    members.forEach(cur => {
        memberIds.push(cur.memberInfo.id);
    });

    var orMemIds: string = "(ApexClassOrTriggerId = '" + memberIds.join("' OR ApexClassOrTriggerId = '") + "') ";
    var orIds: string = testClassIds && testClassIds.length > 0 ? "AND (ApexTestClassId = '" + testClassIds.join("' OR ApexTestClassId = '") + "') " : '';
    var query = 'SELECT Coverage, ApexClassOrTrigger.Name, ApexClassOrTriggerId, NumLinesCovered, NumLinesUncovered '
    + 'FROM' + fromWhere
    + 'WHERE ' + orMemIds
    + orIds
    + 'AND (NumLinesCovered > 0 OR NumLinesUncovered > 0) '
    + 'ORDER BY ApexClassOrTrigger.Name ASC';

    return vscode.window.forceCode.conn.tooling.query(query)
        .then(res => updateCoverage(res))
        .then(finish);

    function finish(res): QueryResult {
        if(res.entityTypeName === 'ApexCodeCoverageAggregate') {
            vscode.window.forceCode.statusBarItem.text = 'ForceCode: Code coverage retrieval complete!';
            vscode.window.forceCode.resetMenu();
        }
        return res;
    }

    // =======================================================================================================================================
    function updateCoverage(res: QueryResult): QueryResult {
        // Add Line Coverage information
        if (res.records) {
            res.records.forEach(function(curRes: forceCode.ICodeCoverage) {
                vscode.window.forceCode.workspaceMembers.some(curr => {
                    if(curr.memberInfo.id === curRes.ApexClassOrTriggerId && curRes.NumLinesUncovered === curRes.Coverage.uncoveredLines.length) {
                        vscode.window.forceCode.codeCoverage[curRes.ApexClassOrTriggerId] = curRes;
                        return true;
                    }
                });
            });
        }

        return res;
    }
}