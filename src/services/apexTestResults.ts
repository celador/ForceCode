import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import { editorUpdateApexCoverageDecorator } from '../decorators/testCoverageDecorator';
import { FCFile } from './codeCovView';
import { codeCovViewService } from '.';
import { QueryResult } from 'jsforce';

export default function getApexTestResults(singleClass?: boolean): Promise<QueryResult> {
  var fromWhere: string = singleClass ? ' ApexCodeCoverage ' : ' ApexCodeCoverageAggregate ';
  var selectMore = singleClass ? 'TestMethodName, ApexTestClassId, ApexTestClass.Name,' : '';
  var query =
    `SELECT ${selectMore} Coverage, ApexClassOrTrigger.Name, ApexClassOrTriggerId, NumLinesCovered, NumLinesUncovered ` +
    'FROM' +
    fromWhere +
    'WHERE (NumLinesCovered > 0 OR NumLinesUncovered > 0) ' +
    `ORDER BY ApexClassOrTrigger.Name${singleClass ? ', TestMethodName' : ''} ASC`;

  return vscode.window.forceCode.conn.tooling.query(query).then(updateCoverage);

  // =======================================================================================================================================
  function updateCoverage(res: QueryResult): QueryResult {
    // Add Line Coverage information
    if (res.records) {
      var highestCov: number = 0;
      var highestClass: FCFile | undefined;
      res.records.forEach(function(curRes: forceCode.ICodeCoverage) {
        const fcfile: FCFile | undefined = codeCovViewService.findById(curRes.ApexClassOrTriggerId);
        if (fcfile && curRes.NumLinesUncovered === curRes.Coverage.uncoveredLines.length) {
          fcfile.setCoverageTestClass('overall');
          if (curRes.ApexTestClass) {
            fcfile.addCoverage(curRes.ApexTestClass.Name + '.' + curRes.TestMethodName, curRes);
          } else {
            fcfile.addCoverage('overall', curRes);
          }
          var total: number = curRes.NumLinesCovered + curRes.NumLinesUncovered;
          var percent = Math.floor((curRes.NumLinesCovered / total) * 100);
          if (percent > highestCov) {
            highestCov = percent;
            highestClass = fcfile;
          }
        }
      });
      // update the current editor
      editorUpdateApexCoverageDecorator(vscode.window.activeTextEditor);

      if (
        singleClass &&
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
