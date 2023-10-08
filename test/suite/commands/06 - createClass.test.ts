import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as path from 'path';
import * as fs from 'fs';
import { afterEach, beforeEach } from 'mocha';
import { codeCovViewService } from '../../../src/services';
import {
  addErrorToDoc,
  removeErrorOnDoc,
  createForceJson,
  timeout,
} from '../../testUtils/utils.test';
import { toArray } from '../../../src/util';
import { getSrcDir } from '../../../src/services/configuration';

suite('createClass.ts and compile.ts', () => {
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    sandbox.stub(vscode.window, 'showWarningMessage').returns({
      async then(callback: any) {
        return callback('Overwrite'); // LWC component
      },
    });
  });
  afterEach(() => {
    sandbox.restore();
  });

  test('Creates new class', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function (items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[1]); // apex class
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function (_options) {
      return {
        async then(callback: any) {
          return callback('testerson'); // name of class
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      // verify the file was created
      let output = path.join(getSrcDir(), 'classes', 'testerson.cls');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save class fail', () => {
    return addErrorToDoc();
  });

  test('Save class pass', () => {
    return removeErrorOnDoc();
  });

  test('Refresh class', async () => {
    let output = path.join(getSrcDir(), 'classes', 'testerson.cls');
    // get the mTime for the file
    const mTime = fs.statSync(output).mtimeMs;
    return await vscode.workspace.openTextDocument(output).then((doc) => {
      return vscode.commands
        .executeCommand('ForceCode.refresh', undefined, [doc.uri])
        .then((_res) => {
          // make sure the file actually refreshed
          return assert.notStrictEqual(mTime, fs.statSync(output).mtimeMs);
        });
    });
  });

  test('Open file (class) in the org', async () => {
    let output = path.join(getSrcDir(), 'classes', 'testerson.cls');
    return await vscode.workspace.openTextDocument(output).then((doc) => {
      return vscode.commands.executeCommand('ForceCode.openFileInOrg', doc.uri).then((_res) => {
        return assert.strictEqual(true, true);
      });
    });
  });

  test('Saves class metadata fail', async () => {
    // open the testerson class metadata
    let output = path.join(getSrcDir(), 'classes', 'testerson.cls-meta.xml');
    await vscode.workspace.openTextDocument(output).then((doc) => {
      return vscode.window.showTextDocument(doc).then(() => {
        // edit the doc to fail
        return addErrorToDoc();
      });
    });
  });

  test('Saves class metadata pass', () => {
    // doc will already be active from the above test
    return removeErrorOnDoc();
  });

  test('Creates Visualforce Page', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function (items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[5]); // VF page
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function (_options) {
      return {
        async then(callback: any) {
          return callback('testerson'); // name of VF page
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      let output = path.join(getSrcDir(), 'pages', 'testerson.page');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save VF page fail', () => {
    return addErrorToDoc();
  });

  test('Save VF page pass', () => {
    return removeErrorOnDoc();
  });

  test('Opens org via ForceCode menu', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function (items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[0]); // Open org option
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.showMenu').then((_res) => {
      return assert.strictEqual(true, true);
    });
  });

  test('Preview VF', async () => {
    let output = path.join(getSrcDir(), 'pages', 'testerson.page');
    return await vscode.workspace.openTextDocument(output).then((doc) => {
      return vscode.commands.executeCommand('ForceCode.previewVF', doc.uri).then((_res) => {
        return assert.strictEqual(true, true);
      });
    });
  });

  test('Creates Visualforce Component', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function (items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[6]); // VF component
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function (_options) {
      return {
        async then(callback: any) {
          return callback('testerson'); // name of component
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      let output = path.join(getSrcDir(), 'components', 'testerson.component');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save VF component fail', () => {
    return addErrorToDoc();
  });

  test('Save VF component pass', () => {
    return removeErrorOnDoc();
  });

  test('Delete VF component', async () => {
    sandbox.restore();
    sandbox
      .stub(vscode.window, 'showWarningMessage')
      .callsFake(function (
        _message: string,
        _options: vscode.MessageOptions,
        ..._items: vscode.MessageItem[]
      ) {
        return {
          async then(callback: any) {
            return callback('Yes'); // Delete the file from the org
          },
        };
      });
    sandbox
      .stub(vscode.window, 'showInformationMessage')
      .callsFake(function (
        _message: string,
        _options: vscode.MessageOptions,
        ..._items: vscode.MessageItem[]
      ) {
        return {
          async then(callback: any) {
            return callback('Yes'); // Delete the file from the workspace
          },
        };
      });
    // doc is already open from the save pass above
    return await vscode.commands.executeCommand('ForceCode.deleteFile').then((_res) => {
      let output = path.join(getSrcDir(), 'components', 'testerson.component');
      return assert.strictEqual(fs.existsSync(output), false);
    });
  });

  test('Creates Aura App', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function (items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[0]); // Aura, app
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function (_options) {
      return {
        async then(callback: any) {
          return callback('testersonAura'); // name of Aura app
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      let output = path.join(getSrcDir(), 'aura', 'testersonAura');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save Aura app fail', () => {
    return addErrorToDoc();
  });

  test('Save Aura app pass', () => {
    return removeErrorOnDoc();
  });

  test('Preview Aura app', async () => {
    let output = path.join(getSrcDir(), 'aura', 'testersonAura', 'testersonAura.app');
    return await vscode.workspace.openTextDocument(output).then((doc) => {
      return vscode.commands.executeCommand('ForceCode.previewApp', doc.uri).then((_res) => {
        return assert.strictEqual(true, true);
      });
    });
  });

  test('Delete Aura app DOCUMENTATION', async () => {
    sandbox.restore();
    sandbox
      .stub(vscode.window, 'showWarningMessage')
      .callsFake(function (
        _message: string,
        _options: vscode.MessageOptions,
        ..._items: vscode.MessageItem[]
      ) {
        return {
          async then(callback: any) {
            return callback('Yes'); // Delete the file from the org
          },
        };
      });
    sandbox
      .stub(vscode.window, 'showInformationMessage')
      .callsFake(function (
        _message: string,
        _options: vscode.MessageOptions,
        ..._items: vscode.MessageItem[]
      ) {
        return {
          async then(callback: any) {
            return callback('Yes'); // Delete the file from the workspace
          },
        };
      });
    let output = path.join(getSrcDir(), 'aura', 'testersonAura', 'testersonAura.auradoc');
    return await vscode.workspace.openTextDocument(output).then((doc) => {
      return vscode.commands.executeCommand('ForceCode.deleteFile', doc.uri).then((_res) => {
        return assert.strictEqual(fs.existsSync(output), false);
      });
    });
  });

  test('Delete Aura app', async () => {
    sandbox.restore();
    sandbox
      .stub(vscode.window, 'showWarningMessage')
      .callsFake(function (
        _message: string,
        _options: vscode.MessageOptions,
        ..._items: vscode.MessageItem[]
      ) {
        return {
          async then(callback: any) {
            return callback('Yes'); // Delete the file from the org
          },
        };
      });
    sandbox
      .stub(vscode.window, 'showInformationMessage')
      .callsFake(function (
        _message: string,
        _options: vscode.MessageOptions,
        ..._items: vscode.MessageItem[]
      ) {
        return {
          async then(callback: any) {
            return callback('Yes'); // Delete the file from the workspace
          },
        };
      });
    let output = path.join(getSrcDir(), 'aura', 'testersonAura', 'testersonAura.app');
    return await vscode.workspace.openTextDocument(output).then((doc) => {
      return vscode.commands.executeCommand('ForceCode.deleteFile', doc.uri).then((_res) => {
        return assert.strictEqual(fs.existsSync(output), false);
      });
    });
  });

  test('Creates Trigger on Account', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function (items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[4]); // Trigger
        },
      };
    });
    let inputStub = sandbox
      .stub(vscode.window, 'showInputBox')
      .onFirstCall()
      .callsFake(function (_options) {
        return {
          async then(callback: any) {
            return callback('testerson'); // name of Trigger
          },
        };
      });
    inputStub.onSecondCall().callsFake(function (_options) {
      return {
        async then(callback: any) {
          return callback('Account'); // Trigger is on Object Account
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      let output = path.join(getSrcDir(), 'triggers', 'testerson.trigger');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save Trigger fail', () => {
    return addErrorToDoc();
  });

  test('Save Trigger pass', () => {
    return removeErrorOnDoc();
  });

  test('Creates LWC Component', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function (items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[3]); // LWC component
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function (_options) {
      return {
        async then(callback: any) {
          return callback('theLWCTest'); // name of component
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      let output = path.join(getSrcDir(), 'lwc', 'theLWCTest');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save LWC fail', () => {
    return addErrorToDoc();
  });

  test('Creates LWC Component 2', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function (items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[3]); // LWC component
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function (_options) {
      return {
        async then(callback: any) {
          return callback('theLWCTest2'); // name of component
        },
      };
    });
    createForceJson(process.env.SF_USERNAME || '', true); // turn on autoCompile
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      let output = path.join(getSrcDir(), 'lwc', 'theLWCTest2');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save LWC pass', () => {
    // indicate we shouldn't try and remove an error, and that autoCompile is on
    return removeErrorOnDoc(true, true);
  });

  test('Creates Lightning Message Channel', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function (items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[2]); // Lightning Message Channel
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function (_options) {
      return {
        async then(callback: any) {
          return callback('MyMessageChannel'); // name of component
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      let output = path.join(getSrcDir(), 'messageChannels', 'MyMessageChannel.messageChannel');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save Lightning Message Channel fail', () => {
    return addErrorToDoc();
  });

  test('Creates Lightning Message Channel 2', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function (items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[2]); // Lightning Message Channel
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function (_options) {
      return {
        async then(callback: any) {
          return callback('MyMessageChannel2'); // name of component
        },
      };
    });
    createForceJson(process.env.SF_USERNAME || '', true); // turn on autoCompile
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      let output = path.join(getSrcDir(), 'messageChannels', 'MyMessageChannel2.messageChannel');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save Lightning Message Channel pass', () => {
    // indicate we shouldn't try and remove an error, and that autoCompile is on
    return removeErrorOnDoc(true, true);
  });

  test('Test multi-save', async () => {
    // indicate we shouldn't try and remove an error, and that autoCompile is on
    removeErrorOnDoc(true, true);
    return timeout(1000).then(() => {
      return removeErrorOnDoc(true, true);
    });
  });

  test('Verify Code Coverage view now has contents', async () => {
    return assert.strictEqual(codeCovViewService.getChildren().length > 0, true);
  });

  test('Check for file changes', async () => {
    return await vscode.commands.executeCommand('ForceCode.checkForFileChanges').then((_res) => {
      return assert.strictEqual(true, true);
    });
  });
});
