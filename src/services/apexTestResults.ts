import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import { QueryResult } from '../services/dxService';

export default function getApexTestResults(testClassIds?: string[]): Promise<QueryResult> {
    let members: forceCode.IWorkspaceMember[] = vscode.window.forceCode.workspaceMembers;
    var memberIds: string[] = new Array<string>();
    
    members.forEach(cur => {
        memberIds.push(cur.memberInfo.id);
    });

    var orMemIds: string = "(ApexClassOrTriggerId = '" + memberIds.join("' OR ApexClassOrTriggerId = '") + "') ";
    var orIds: string = testClassIds && testClassIds.length > 0 ? "AND (ApexTestClassId = '" + testClassIds.join("' OR ApexTestClassId = '") + "') " : '';
    var query = 'SELECT Coverage, ApexTestClassId, ApexClassOrTrigger.Name, ApexClassOrTriggerId, NumLinesCovered, NumLinesUncovered '
    + 'FROM ApexCodeCoverage '
    + 'WHERE ' + orMemIds
    + orIds
    + 'AND (NumLinesCovered > 0 OR NumLinesUncovered > 0)';

    return vscode.window.forceCode.conn.tooling.query(query)
        .then(res => updateCoverage(res));


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