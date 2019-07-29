import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import { defaultOptions } from '../../src/services';
import * as assert from 'assert';

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

export function createForceJson(username: string, autoCompile?: boolean) {
  if (vscode.workspace.workspaceFolders) {
    if (!autoCompile) {
      removeProjectFiles();
    }
    var thePathOrg = vscode.workspace.workspaceFolders[0].uri.fsPath;
    var thePath = path.join(thePathOrg, 'force.json');
    const forceData = {
      lastUsername: username,
    };
    fs.writeFileSync(thePath, JSON.stringify(forceData));
    if (username) {
      const fcPath = path.join(thePathOrg, '.forceCode', username);
      fs.mkdirpSync(fcPath);
      var settings = Object.assign(defaultOptions, {
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

export function addErrorToDoc(sandbox) {
  var editor = vscode.window.activeTextEditor;
  if (!editor) {
    return {
      async then(callback) {
        return callback(assert.strictEqual(true, false));
      },
    };
  }
  const position = editor.document.positionAt(0);
  editor.edit(edit => {
    edit.insert(position, '<'); // add a syntax error
  });
  const spy = sandbox.spy(vscode.window, 'showErrorMessage');
  return editor.document.save().then(res => {
    return vscode.commands.executeCommand('ForceCode.compile').then(res2 => {
      return assert.strictEqual(spy.calledOnce, true);
    });
  });
}

export function removeErrorOnDoc(sandbox, dontRemove?, autoCompile?) {
  var editor = vscode.window.activeTextEditor;
  if (!editor) {
    return {
      async then(callback) {
        return callback(assert.strictEqual(true, false));
      },
    };
  }
  if (!dontRemove) {
    const position = editor.document.positionAt(0);
    const position2 = editor.document.positionAt(1);
    const range: vscode.Range = new vscode.Range(position, position2);
    editor.edit(edit => {
      edit.delete(range); // remove syntax error
    });
  } else {
    const position = editor.document.positionAt(0);
    editor.edit(edit => {
      edit.insert(position, ' ');
    });
  }
  const spy = sandbox.spy(vscode.window, 'showErrorMessage');
  return editor.document.save().then(async res => {
    if (!autoCompile) {
      await vscode.commands.executeCommand('ForceCode.compile');
      return assert.strictEqual(spy.called, false);
    } else {
      // TODO: Find a way to wait for the save to be done
      return assert.strictEqual(spy.called, false);
    }
  });
}
