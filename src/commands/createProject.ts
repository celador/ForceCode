import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';

export function createProject(): Thenable<void> {
  return vscode.window
    .showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: `Create Project`,
    })
    .then((folder) => {
      if (!folder) {
        return;
      }
      // create default src folder so sfdx doesn't complain about a bad dir
      const projFolder: string = folder[0].fsPath;

      // make a dummy force.json to activate Forcecode
      fs.outputFileSync(
        path.join(projFolder, 'force.json'),
        JSON.stringify({ lastUsername: '' }, undefined, 4)
      );
      // open the folder
      if (!vscode.workspace.getWorkspaceFolder(folder[0])) {
        vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projFolder));
      } else {
        // reload to start
        console.log('reloading...');
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    });
}
