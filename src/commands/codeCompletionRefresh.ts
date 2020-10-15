import * as vscode from 'vscode';
import { FauxClassGenerator } from '../dx';
import { SObjectCategory, notifications } from '../services';
import { ForcecodeCommand } from '.';

export class CodeCompletionRefresh extends ForcecodeCommand {
  constructor() {
    super();
    this.cancelable = true;
    this.commandName = 'ForceCode.codeCompletionRefresh';
    this.name = 'Refreshing Code Completion';
    this.hidden = false;
    this.description = 'Refresh objects from org';
    this.detail =
      'Generate faux sObject classes for apex code completion using the Salesforce apex plugin.';
    this.icon = 'code';
    this.label = 'Code Completion Refresh';
  }

  public async command(): Promise<any> {
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
    let objectsToGet: SObjectCategory;
    const cancellationToken = this.cancellationToken;
    await vscode.window
      .showQuickPick(options, config)
      .then((res: vscode.QuickPickItem | undefined) => {
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
        notifications.showLog();
        let gen = new FauxClassGenerator();
        try {
          let startTime = new Date().getTime();
          await gen.generate(
            vscode.window.forceCode.workspaceRoot,
            objectsToGet,
            cancellationToken
          );
          let endTime = new Date().getTime();
          notifications.writeLog(
            'Refresh took ' + Math.round((endTime - startTime) / (1000 * 60)) + ' minutes.'
          );
          return notifications
            .showInfo('ForceCode: Retrieval of objects complete! Reload window now?', 'Yes', 'No')
            .then(choice => {
              if (choice === 'Yes') {
                return vscode.commands.executeCommand('workbench.action.reloadWindow');
              } else {
                return Promise.resolve();
              }
            });
        } catch (e) {
          return Promise.reject();
        }
      });
    // =======================================================================================================================================
  }
}
