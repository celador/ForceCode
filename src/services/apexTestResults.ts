import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import { QueryResult } from '../services/dxService';
import { editorUpdateApexCoverageDecorator } from '../decorators/testCoverageDecorator';
import { FCFile } from './codeCovView';
import { codeCovViewService } from '.';

export default function getApexTestResults(testClassIds?: string[]): Promise<QueryResult> {
  var fromWhere: string =
    testClassIds && testClassIds.length === 1
      ? ' ApexCodeCoverage '
      : ' ApexCodeCoverageAggregate ';
  var orIds: string =
    testClassIds && testClassIds.length === 1
      ? "AND ApexTestClassId = '" + testClassIds[0] + "' "
      : '';
  var query =
    'SELECT Coverage, ApexClassOrTrigger.Name, ApexClassOrTriggerId, NumLinesCovered, NumLinesUncovered ' +
    'FROM' +
    fromWhere +
    'WHERE (NumLinesCovered > 0 OR NumLinesUncovered > 0) ' +
    orIds +
    'ORDER BY ApexClassOrTrigger.Name ASC';

  return vscode.window.forceCode.conn.tooling.query(query).then(res => updateCoverage(res));

  // =======================================================================================================================================
  function updateCoverage(res: QueryResult): QueryResult {
    // Add Line Coverage information
    if (res.records) {
      var highestCov: number = 0;
      var highestClass: FCFile;
      res.records.forEach(function(curRes: forceCode.ICodeCoverage) {
        const fcfile: FCFile = codeCovViewService.findById(curRes.ApexClassOrTriggerId);
        if (fcfile && curRes.NumLinesUncovered === curRes.Coverage.uncoveredLines.length) {
          var wsMem: forceCode.IWorkspaceMember = fcfile.getWsMember();
          wsMem.coverage = curRes;
          var total: number = curRes.NumLinesCovered + curRes.NumLinesUncovered;
          var percent = Math.floor((curRes.NumLinesCovered / total) * 100);
          if (percent > highestCov) {
            highestCov = percent;
            highestClass = fcfile;
          }
          fcfile.updateWsMember(wsMem);
        }
      });
      // update the current editor
      editorUpdateApexCoverageDecorator(vscode.window.activeTextEditor);

      if (
        testClassIds &&
        highestClass &&
        vscode.workspace.getConfiguration('force')['revealTestedClass']
      ) {
        // reveal the tested class
        var treePro = vscode.window.createTreeView('ForceCode.codeCovDataProvider', {
          treeDataProvider: codeCovViewService,
        });
        treePro.reveal(highestClass);
      }
    }

    return res;
  }
}
