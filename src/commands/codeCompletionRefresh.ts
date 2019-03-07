import * as vscode from 'vscode';
import { FauxClassGenerator, SObjectCategory } from '../dx';

export default async function codeCompletionRefresh(): Promise<any> {
  let options: vscode.QuickPickItem[] = [
    {
      description: 'Generate faux classes for all objects',
      label: 'All',
    },
    {
      description: 'Generate faux classes for standard objects',
      label: 'Standard',
    },
    {
      description: 'Generate faux classes for custom objects',
      label: 'Custom',
    },
  ];
  let config: {} = {
    matchOnDescription: true,
    matchOnDetail: true,
    placeHolder: 'Choose an option...',
  };
  var objectsToGet: SObjectCategory;
  await vscode.window
    .showQuickPick(options, config)
    .then((res: vscode.QuickPickItem) => {
      if (!res) {
        return Promise.resolve();
      }
      if (res.label === 'All') {
        objectsToGet = SObjectCategory.ALL;
      } else if (res.label === 'Standard') {
        objectsToGet = SObjectCategory.STANDARD;
      } else {
        objectsToGet = SObjectCategory.CUSTOM;
      }
    })
    .then(async function() {
      if (!objectsToGet) {
        return Promise.resolve();
      }
      vscode.window.forceCode.outputChannel.clear();
      vscode.window.forceCode.outputChannel.show();
      var gen = new FauxClassGenerator();
      try {
        var startTime = new Date().getTime();
        await gen.generate(vscode.window.forceCode.workspaceRoot, objectsToGet);
        var endTime = new Date().getTime();
        vscode.window.forceCode.outputChannel.appendLine(
          'Refresh took ' + Math.round((endTime - startTime) / (1000 * 60)) + ' minutes.'
        );
        vscode.window.showInformationMessage('ForceCode: Retrieval of objects complete!!!', 'OK');
        return Promise.resolve();
      } catch (e) {
        return Promise.reject();
      }
    });
  // =======================================================================================================================================
}
