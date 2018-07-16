import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import { QueryResult } from '../services/dxService';
import { editorUpdateApexCoverageDecorator } from '../decorators/testCoverageDecorator';

export default function getApexTestResults(testClassIds?: string[]): Promise<QueryResult> {
    var fromWhere: string = testClassIds && testClassIds.length === 1 ? ' ApexCodeCoverage ' : ' ApexCodeCoverageAggregate ';
    var orIds: string = testClassIds && testClassIds.length === 1 ? "AND ApexTestClassId = '" + testClassIds[0] + "' " : '';
    var query = 'SELECT Coverage, ApexClassOrTrigger.Name, ApexClassOrTriggerId, NumLinesCovered, NumLinesUncovered '
    + 'FROM' + fromWhere
    + 'WHERE (NumLinesCovered > 0 OR NumLinesUncovered > 0) '
    + orIds
    + 'ORDER BY ApexClassOrTrigger.Name ASC';

    return vscode.window.forceCode.conn.tooling.query(query)
        .then(res => updateCoverage(res));

    // =======================================================================================================================================
    function updateCoverage(res: QueryResult): QueryResult {
        // Add Line Coverage information
        if (res.records) {
            res.records.forEach(function(curRes: forceCode.ICodeCoverage) {
                if(vscode.window.forceCode.workspaceMembers[curRes.ApexClassOrTriggerId] && curRes.NumLinesUncovered === curRes.Coverage.uncoveredLines.length) {
                    vscode.window.forceCode.codeCoverage[curRes.ApexClassOrTriggerId] = curRes;
                }
            });
            vscode.window.forceCode.updateFileMetadata(vscode.window.forceCode.workspaceMembers);
            // update the current editor
            editorUpdateApexCoverageDecorator(vscode.window.activeTextEditor);
        }

        return res;
    }
}