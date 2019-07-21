import * as vscode from 'vscode';
import {
  fcConnection,
  dxService,
  ApexTestQueryResult,
  apexTestResults,
  notifications,
} from './../services';
import { ForcecodeCommand } from './forcecodeCommand';
import { updateDecorations } from '../decorators/testCoverageDecorator';
import { FCFile } from '../services/codeCovView';

export class ToggleCoverage extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.toggleCoverage';
    this.hidden = true;
  }

  public command(context, selectedResource?) {
    vscode.window.forceCode.config.showTestCoverage = !vscode.window.forceCode.config
      .showTestCoverage;
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

  public command(context, selectedResource?) {
    return apexTestResults();
  }
}

export class RunTests extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.runTests';
    this.hidden = true;
  }

  public command(context, selectedResource?) {
    var ctv = context;
    if (context instanceof FCFile) {
      ctv = { name: context.getWsMember().name, type: 'class' };
    }
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
    function showResult(dxRes: ApexTestQueryResult) {
      if (dxRes.summary.failing && dxRes.summary.failing > 0) {
        let errorMessage: string = 'FAILED: ';
        dxRes.tests.forEach(curTest => {
          //if (/*curTest.StackTrace && */curTest.Message) {
          errorMessage +=
            (curTest.StackTrace ? curTest.StackTrace + '\n' : '') +
            (curTest.Message ? curTest.Message + '\n' : '');
          //}
        });
        notifications.showError(errorMessage);
      } else {
        notifications.showInfo('ForceCode: All Tests Passed!', 'Ok');
      }
      return dxRes;
    }
    function showLog(): Promise<vscode.TextEditor | void> {
      if (vscode.workspace.getConfiguration('force')['showTestLog']) {
        if (!fcConnection.currentConnection) {
          return Promise.reject('No current org info found');
        }
        return Promise.resolve(dxService.getAndShowLog(undefined /*res.records[0].Id*/));
      } else {
        return Promise.resolve();
      }
    }
  }
}
