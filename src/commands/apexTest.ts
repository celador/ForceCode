import * as vscode from 'vscode';
import { fcConnection, dxService } from './../services';
import apexTestResults from '../services/apexTestResults';
import { QueryResult } from '../services/dxService';

export default function apexTest(toTest: string, classOrMethod: string): Promise<any> {
  // Start doing stuff
  // remove test coverage stuff
  var toRun: string;
  if (classOrMethod === 'class') {
    toRun = '-n ' + toTest;
  } else {
    toRun = '-t ' + toTest;
  }
  return dxService.runCommand('apex:test:run', toRun + ' -w 3 -y').then((dxRes: QueryResult) => {
    // get the test class Ids from the result
    var testClassIds: string[] = new Array<string>();
    dxRes.tests.forEach(tRes => {
      testClassIds.push(tRes.ApexClass.Id);
    });

    return apexTestResults(testClassIds)
      .then(() => showResult(dxRes))
      .then(showLog);
  });

  // =======================================================================================================================================
  function showResult(dxRes: QueryResult) {
    if (dxRes.summary.failing && dxRes.summary.failing > 0) {
      let errorMessage: string = 'FAILED: ';
      dxRes.tests.forEach(curTest => {
        if (curTest.StackTrace && curTest.Message) {
          errorMessage += curTest.StackTrace + '\n' + curTest.Message + '\n';
        }
      });
      vscode.window.showErrorMessage(errorMessage);
    } else {
      vscode.window.showInformationMessage('ForceCode: All Tests Passed!', 'Ok');
    }
    return dxRes;
  }
  function showLog(): Promise<vscode.TextEditor | void> {
    if (vscode.workspace.getConfiguration('force')['showTestLog']) {
      if (!fcConnection.currentConnection) {
        return Promise.reject('No current org info found');
      }
      var queryString: string =
        `SELECT Id FROM ApexLog` +
        ` WHERE LogUserId IN (SELECT Id FROM User WHERE UserName='${
          fcConnection.currentConnection.orgInfo.username
        }')` +
        // ` AND Request = 'API' AND Location = 'SystemLog'` +
        // ` AND Operation like '%executeAnonymous%'`
        ` ORDER BY StartTime DESC, Id DESC LIMIT 1`;
      return vscode.window.forceCode.conn.tooling.query(queryString).then(res => {
        return dxService.getAndShowLog(res.records[0].Id);
      });
    } else {
      return Promise.resolve();
    }
  }
  // =======================================================================================================================================
}
