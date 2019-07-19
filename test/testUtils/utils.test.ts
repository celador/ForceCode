import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import sfdxRetValsTest from './sfdxRetVals.test';
import { FCCancellationToken } from '../../src/commands/forcecodeCommand';

export function createProjectDir(): vscode.Uri[] | undefined {
  var folder = '.';
  var folderUri: vscode.Uri[] | undefined;
  if (vscode.workspace.workspaceFolders) {
    const wsUri = vscode.workspace.workspaceFolders[0].uri;
    folder = wsUri.fsPath;
    folder = path.join(folder, 'test');
    removeDirOrFile(folder);
    fs.mkdirpSync(folder);
    console.log('Folder opened: ' + folder);
    var folderUriPre = vscode.Uri.file(folder);
    folderUri = [
      Object.assign({}, wsUri, {
        fsPath: folder,
        path: folderUriPre.path,
        _fsPath: folder,
      }),
    ];
  }
  return folderUri;
}

export function createForceJson(username: string | undefined) {
  if (vscode.workspace.workspaceFolders) {
    var thePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    thePath = path.join(thePath, 'force.json');
    const forceData = {
      lastUsername: username ? username : sfdxRetValsTest['org:display'].username,
    };
    fs.writeFileSync(thePath, JSON.stringify(forceData));
  }
}

export function removeProjectFiles() {
  if (vscode.workspace.workspaceFolders) {
    var thePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    removeDirOrFile(path.join(thePath, 'force.json'));
    removeDirOrFile(path.join(thePath, 'sfdx-project.json'));
    removeDirOrFile(path.join(thePath, '.forceCode'));
    removeDirOrFile(path.join(thePath, '.sfdx'));
    removeDirOrFile(path.join(thePath, 'src'));
    removeDirOrFile(path.join(thePath, 'test'));
  }
}

export function executeSFDXCommand(
  cmdString: string,
  targetusername: boolean,
  cancellationToken?: FCCancellationToken
): Promise<any> {
  var command = cmdString.split('force:').pop();
  command = command ? command.split(' ').shift() : undefined;
  console.log(command + ' SFDX command invoked');
  return Promise.resolve(command ? sfdxRetValsTest[command] : undefined);
}

function removeDirOrFile(thePath: string) {
  if (fs.existsSync(thePath)) {
    fs.removeSync(thePath);
  }
}
