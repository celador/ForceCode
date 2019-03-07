import * as vscode from 'vscode';
import { fcCommands } from './../models/commands';
import { commandService, fcConnection } from '../services';

export default function showMenu(context: vscode.ExtensionContext) {
  var quickpick: any[] = [];
  if (!fcConnection.isLoggedIn()) {
    return commandService.runCommand('ForceCode.switchUser', undefined);
  }
  return Promise.resolve(vscode.window.forceCode)
    .then(displayMenu)
    .then(res => processResult(res));
  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================

  function displayMenu() {
    fcCommands.forEach(cur => {
      if (!cur.hidden) {
        if (cur.commandName !== 'ForceCode.createScratchOrg') {
          quickpick.push(cur);
        } else if (
          fcConnection.currentConnection &&
          fcConnection.currentConnection.orgInfo.isDevHub
        ) {
          quickpick.push(cur);
        }
      }
    });

    let options: vscode.QuickPickItem[] = quickpick.map(record => {
      return {
        description: `${record.description}`,
        detail: `${record.detail}`,
        label: `$(${record.icon}) ${record.label}`,
      };
    });
    let config: {} = {
      matchOnDescription: true,
      matchOnDetail: true,
      placeHolder: 'Run a command',
    };
    return vscode.window.showQuickPick(options, config);
  }
  function processResult(result) {
    if (result !== undefined && result.description !== undefined) {
      return commandService.runCommand(
        quickpick.find(cur => {
          return result.description === cur.description;
        }).commandName,
        context
      );
    }
  }
}
