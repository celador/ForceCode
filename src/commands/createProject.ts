import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { fcConnection } from '../services';

export function createProject(): Thenable<void> {
  return vscode.window
    .showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: `Create Project`,
    })
    .then(async (folder) => {
      if (!folder) {
        return;
      }
      // create default src folder so sfdx doesn't complain about a bad dir
      const projFolder: string = folder[0].fsPath;

      // if the chosen folder already has a single saved username, pick it back up so the
      // project reconnects to the same org. read from projFolder, not the current workspace,
      // since this command also runs before ForceCode is initialized.
      let lastUsername = '';
      const savedUsernames = await fcConnection.getSavedUsernames(projFolder);
      if (savedUsernames.length === 1) {
        lastUsername = savedUsernames[0];
      }

      // make a dummy force.json to activate Forcecode
      fs.outputFileSync(
        path.join(projFolder, 'force.json'),
        JSON.stringify({ lastUsername }, undefined, 4)
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
