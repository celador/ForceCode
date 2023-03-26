import * as vscode from 'vscode';
import * as forceCode from '../forceCode';
import { codeCovViewService, FCFile, getVSCodeSetting } from '.';
import { QueryResult } from 'jsforce';
import { getSrcDir, VSCODE_SETTINGS } from './configuration';
import * as path from 'path';

export function getApexTestResults(singleClass?: boolean): Promise<QueryResult> {
  const fromWhere = singleClass ? ' ApexCodeCoverage ' : ' ApexCodeCoverageAggregate ';
  const selectMore = singleClass ? 'TestMethodName, ApexTestClassId, ApexTestClass.Name,' : '';
  const query =
    `SELECT ${selectMore} Coverage, ApexClassOrTrigger.Name, ApexClassOrTriggerId, NumLinesCovered, NumLinesUncovered` +
    `FROM${fromWhere}` +
    'WHERE (NumLinesCovered > 0 OR NumLinesUncovered > 0) ' +
    `ORDER BY ApexClassOrTrigger.Name${singleClass ? ', TestMethodName' : ''} ASC`;
  return vscode.window.forceCode.conn.tooling.query(query).then(updateCoverage);

  function updateCoverage(res: QueryResult): QueryResult {
    if (res.records) {
      let highestCov = 0;
      let highestClass: FCFile | undefined;
      res.records.forEach((curRes: forceCode.ICodeCoverage) => {
        const className = curRes.ApexClassOrTrigger?.Name;
        if (!className) return;

        // 01p is an ApexClass, 01q is a trigger
        const fileType = curRes.ApexClassOrTriggerId.startsWith('01p') ? 'classes' : 'triggers';
        const fileExtension = fileType === 'classes' ? '.cls' : '.trigger';
        const thePath = path.join(getSrcDir(), fileType, className + fileExtension);
        const fcfile: FCFile | undefined = codeCovViewService.findByPath(thePath);

        if (fcfile && curRes.NumLinesUncovered === curRes.Coverage.uncoveredLines.length) {
          fcfile.setCoverageTestClass('overall');
          if (curRes.ApexTestClass?.Name) {
            fcfile.addCoverage(curRes.ApexTestClass.Name + '.' + curRes.TestMethodName, curRes);
          } else {
            fcfile.addCoverage('overall', curRes);
          }
          const total = curRes.NumLinesCovered + curRes.NumLinesUncovered;
          const percent = Math.floor((curRes.NumLinesCovered / total) * 100);
          if (percent > highestCov) {
            highestCov = percent;
            highestClass = fcfile;
          }
        }
      });

      if (singleClass && highestClass && getVSCodeSetting(VSCODE_SETTINGS.revealTestedClass)) {
        // reveal the tested class
        const treePro = vscode.window.createTreeView('ForceCode.codeCovDataProvider', {
          treeDataProvider: codeCovViewService,
        });
        treePro.reveal(highestClass);
      }
    }

    return res;
  }
}
