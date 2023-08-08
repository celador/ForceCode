import * as vscode from 'vscode';
import {
  fcConnection,
  dxService,
  ApexTestQueryResult,
  getApexTestResults,
  FCFile,
  notifications,
  getVSCodeSetting,
  commandViewService,
} from '../services';
import { ForcecodeCommand } from '.';
import { updateDecorations } from '../decorators';
import { CoverageRetrieveType } from '../services/commandView';
import { VSCODE_SETTINGS } from '../services/configuration';

export class ToggleCoverage extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.toggleCoverage';
    this.hidden = true;
  }

  public command() {
    vscode.window.forceCode.config.showTestCoverage =
      !vscode.window.forceCode.config.showTestCoverage;
    return updateDecorations();
  }
}

export class GetCodeCoverage extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.getCodeCoverage';
    this.name = 'Retrieving code coverage';
    this.hidden = true;
  }

  public command() {
    return getApexTestResults()
      .then(() => getApexTestResults(true))
      .then(() => updateDecorations());
  }
}

export class RunTests extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.runTests';
    this.hidden = true;
  }

  public command(context: any) {
    const ctv =
      context instanceof FCFile ? { name: context.getWsMember().name, type: 'class' } : context;
    return vscode.commands.executeCommand('ForceCode.apexTest', ctv.name, ctv.type);
  }
}

export class ApexTest extends ForcecodeCommand {
  constructor() {
    super();
    this.cancelable = true;
    this.commandName = 'ForceCode.apexTest';
    this.name = 'Running apex test';
    this.hidden = true;
  }

  public command(context: any, selectedResource: any): any {
    return dxService
      .runTest(context, selectedResource, this.cancellationToken)
      .then((dxRes: ApexTestQueryResult) => {
        return commandViewService
          .enqueueCodeCoverage(CoverageRetrieveType.RunTest)
          .then(() => showResult(dxRes))
          .then(showLog);
      });

    // =======================================================================================================================================
    function showResult(dxRes: ApexTestQueryResult) {
      if (dxRes.summary.failing > 0) {
        let errorMessage: string = 'FAILED: ';
        dxRes.tests.forEach((curTest) => {
          errorMessage +=
            (curTest.StackTrace ? curTest.StackTrace + '\n' : '') +
            (curTest.Message ? curTest.Message + '\n' : '');
        });
        notifications.showError(errorMessage);
      } else {
        notifications.showInfo('ForceCode: All Tests Passed!', 'Ok');
      }
      return dxRes;
    }

    function showLog(): Promise<vscode.TextEditor | void> {
      if (getVSCodeSetting(VSCODE_SETTINGS.showTestLog)) {
        if (!fcConnection.currentConnection) {
          return Promise.reject('No current org info found');
        }
        const queryString: string =
          `SELECT Id FROM ApexLog` +
          ` WHERE LogUserId='${fcConnection.currentConnection.orgInfo.userId}'` +
          ` ORDER BY StartTime DESC, Id DESC LIMIT 1`;

        return vscode.window.forceCode.conn.tooling.query(queryString).then((recs) => {
          return Promise.resolve(dxService.getAndShowLog(recs.records[0].Id));
        });
      } else {
        return Promise.resolve();
      }
    }
  }
}
