import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import sfdxRetValsTest from './sfdxRetVals.test';
import { defaultOptions } from '../../src/services';

export function createProjectDir(): vscode.Uri[] | undefined {
  var folder = '.';
  var folderUri: vscode.Uri[] | undefined;
  if (vscode.workspace.workspaceFolders) {
    const wsUri = vscode.workspace.workspaceFolders[0].uri;
    folder = wsUri.fsPath;
    folder = path.join(folder, 'test');
    removeDirOrFile(folder);
    fs.mkdirpSync(folder);
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
    removeProjectFiles();
    var thePathOrg = vscode.workspace.workspaceFolders[0].uri.fsPath;
    var thePath = path.join(thePathOrg, 'force.json');
    const forceData = {
      lastUsername: username ? username : sfdxRetValsTest['org:display'].username,
    };
    fs.writeFileSync(thePath, JSON.stringify(forceData));
    if (username) {
      const fcPath = path.join(thePathOrg, '.forceCode', username);
      fs.mkdirpSync(fcPath);
      var settings = Object.assign(defaultOptions, {
        url: 'https://login.salesforce.com',
        autoCompile: true,
        username: username,
      });
      fs.writeFileSync(path.join(fcPath, 'settings.json'), JSON.stringify(settings));
    }
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

function removeDirOrFile(thePath: string) {
  if (fs.existsSync(thePath)) {
    fs.removeSync(thePath);
  }
}
