import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import { defaultOptions, SaveResult } from '../../src/services';
import * as assert from 'assert';

export function createProjectDir(): vscode.Uri[] | undefined {
  let folder = '.';
  let folderUri: vscode.Uri[] | undefined;
  if (vscode.workspace.workspaceFolders) {
    const wsUri = vscode.workspace.workspaceFolders[0].uri;
    folder = wsUri.fsPath;
    folder = path.join(folder, 'test');
    removeDirOrFile(folder);
    fs.mkdirpSync(folder);
    let folderUriPre = vscode.Uri.file(folder);
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

export function createForceJson(username: string, autoCompile?: boolean) {
  if (vscode.workspace.workspaceFolders) {
    if (!autoCompile) {
      removeProjectFiles();
    }
    let thePathOrg = vscode.workspace.workspaceFolders[0].uri.fsPath;
    let thePath = path.join(thePathOrg, 'force.json');
    const forceData = {
      lastUsername: username,
    };
    fs.writeFileSync(thePath, JSON.stringify(forceData));
    if (username) {
      const fcPath = path.join(thePathOrg, '.forceCode', username);
      fs.mkdirpSync(fcPath);
      let settings = Object.assign(defaultOptions, {
        url: 'https://login.salesforce.com',
        autoCompile: autoCompile ? autoCompile : false,
        username: username,
      });
      fs.writeFileSync(path.join(fcPath, 'settings.json'), JSON.stringify(settings));
    }
  }
}

export function removeProjectFiles() {
  if (vscode.workspace.workspaceFolders) {
    let thePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
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

export function addErrorToDoc() {
  let editor = vscode.window.activeTextEditor;
  if (!editor) {
    return {
      async then(callback: any) {
        return callback(assert.strictEqual(true, false));
      },
    };
  }
  const position = editor.document.positionAt(0);
  editor.edit((edit) => {
    edit.insert(position, '<'); // add a syntax error
  });
  vscode.window.forceCode.lastSaveResult = undefined;
  return editor.document.save().then((_res) => {
    return vscode.commands.executeCommand('ForceCode.compile').then(async (_res2) => {
      return await getSaveResult(false);
    });
  });
}

export function removeErrorOnDoc(dontRemove?: boolean, autoCompile?: boolean) {
  let editor = vscode.window.activeTextEditor;
  if (!editor) {
    return {
      async then(callback: any) {
        return callback(assert.strictEqual(true, false));
      },
    };
  }
  const position = editor.document.positionAt(0);
  const position2 = editor.document.positionAt(1);
  const range: vscode.Range = new vscode.Range(position, position2);
  editor.edit((edit) => {
    if (dontRemove) {
      edit.insert(position, '<');
    }
    edit.delete(range); // remove syntax error
  });
  vscode.window.forceCode.lastSaveResult = undefined;
  return editor.document.save().then(async (_res) => {
    if (!autoCompile) {
      await vscode.commands.executeCommand('ForceCode.compile');
    }
    return await getSaveResult(true);
  });
}

function getSaveResult(expected: boolean): Promise<any> {
  const MAX_TIME = 120;
  let seconds = 0;
  return new Promise<SaveResult | undefined>((resolve, _reject) => checkResult(resolve)).then(
    (res) => {
      if (res) {
        return assert.strictEqual(expected, res.result.success, res.result.messages.join('\n'));
      } else {
        return assert.strictEqual(expected, !expected, 'Timeout on save');
      }
    }
  );

  async function checkResult(resolveFunc: {
    (value?: SaveResult | PromiseLike<SaveResult | undefined> | undefined): void;
    (arg0: SaveResult | undefined): any;
  }): Promise<any> {
    if (seconds > MAX_TIME) {
      return resolveFunc();
    }

    if (!vscode.window.forceCode.lastSaveResult) {
      seconds++;
      await timeout(1000);
      return checkResult(resolveFunc);
    } else {
      return resolveFunc(vscode.window.forceCode.lastSaveResult);
    }
  }
}

export function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
