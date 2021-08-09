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

suite('Source: createClass.ts and compile.ts', () => {
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    vscode.window.forceCode.config.useSourceFormat = true;
    sandbox.stub(vscode.window, 'showWarningMessage').returns({
      async then(callback: any) {
        return callback('Overwrite'); // LWC component
      },
    });
  });
  afterEach(() => {
    vscode.window.forceCode.config.useSourceFormat = false;
    sandbox.restore();
  });

  test('Source: Creates new class', async () => {
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
          return callback('testersonSource'); // name of class
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      // verify the file was created
      let output = path.join(getSrcDir(), 'classes', 'testersonSource.cls');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Source: Save class fail', async () => {
    await addErrorToDoc();
  });

  test('Source: Save class pass', async () => {
    await removeErrorOnDoc();
  });

  test('Source: Refresh class', async () => {
    let output = path.join(getSrcDir(), 'classes', 'testersonSource.cls');
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

  test('Source: Open file (class) in the org', async () => {
    let output = path.join(getSrcDir(), 'classes', 'testersonSource.cls');
    return await vscode.workspace.openTextDocument(output).then((doc) => {
      return vscode.commands.executeCommand('ForceCode.openFileInOrg', doc.uri).then((_res) => {
        return assert.strictEqual(true, true);
      });
    });
  });

  test('Source: Saves class metadata fail', async () => {
    // open the testerson class metadata
    let output = path.join(getSrcDir(), 'classes', 'testersonSource.cls-meta.xml');
    await vscode.workspace.openTextDocument(output).then((doc) => {
      return vscode.window.showTextDocument(doc).then(() => {
        // edit the doc to fail
        return addErrorToDoc();
      });
    });
  });

  test('Source: Saves class metadata pass', async () => {
    // doc will already be active from the above test
    await removeErrorOnDoc();
  });

  test('Source: Creates Visualforce Page', async () => {
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
          return callback('testersonSource'); // name of VF page
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      let output = path.join(getSrcDir(), 'pages', 'testersonSource.page');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Source: Save VF page fail', async () => {
    await addErrorToDoc();
  });

  test('Source: Save VF page pass', async () => {
    await removeErrorOnDoc();
  });

  test('Source: Opens org via ForceCode menu', async () => {
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

  test('Source: Preview VF', async () => {
    let output = path.join(getSrcDir(), 'pages', 'testersonSource.page');
    return await vscode.workspace.openTextDocument(output).then((doc) => {
      return vscode.commands.executeCommand('ForceCode.previewVF', doc.uri).then((_res) => {
        return assert.strictEqual(true, true);
      });
    });
  });

  test('Source: Creates Visualforce Component', async () => {
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
          return callback('testersonSource'); // name of component
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      let output = path.join(getSrcDir(), 'components', 'testersonSource.component');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Source: Save VF component fail', async () => {
    await addErrorToDoc();
  });

  test('Source: Save VF component pass', async () => {
    await removeErrorOnDoc();
  });

  test('Source: Delete VF component', async () => {
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
      let output = path.join(getSrcDir(), 'components', 'testersonSource.component');
      return assert.strictEqual(fs.existsSync(output), false);
    });
  });

  test('Source: Creates Aura App', async () => {
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
          return callback('testersonAuraSource'); // name of Aura app
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      let output = path.join(getSrcDir(), 'aura', 'testersonAuraSource');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Source: Save Aura app fail', async () => {
    await addErrorToDoc();
  });

  test('Source: Save Aura app pass', async () => {
    await removeErrorOnDoc();
  });

  test('Source: Preview Aura app', async () => {
    let output = path.join(getSrcDir(), 'aura', 'testersonAuraSource', 'testersonAuraSource.app');
    return await vscode.workspace.openTextDocument(output).then((doc) => {
      return vscode.commands.executeCommand('ForceCode.previewApp', doc.uri).then((_res) => {
        return assert.strictEqual(true, true);
      });
    });
  });

  test('Source: Delete Aura app DOCUMENTATION', async () => {
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
    let output = path.join(
      getSrcDir(),
      'aura',
      'testersonAuraSource',
      'testersonAuraSource.auradoc'
    );
    return await vscode.workspace.openTextDocument(output).then((doc) => {
      return vscode.commands.executeCommand('ForceCode.deleteFile', doc.uri).then((_res) => {
        return assert.strictEqual(fs.existsSync(output), false);
      });
    });
  });

  test('Source: Delete Aura app', async () => {
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
    let output = path.join(getSrcDir(), 'aura', 'testersonAuraSource', 'testersonAuraSource.app');
    return await vscode.workspace.openTextDocument(output).then((doc) => {
      return vscode.commands.executeCommand('ForceCode.deleteFile', doc.uri).then((_res) => {
        return assert.strictEqual(fs.existsSync(output), false);
      });
    });
  });

  test('Source: Creates Trigger on Account', async () => {
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
            return callback('testersonSource'); // name of Trigger
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
      let output = path.join(getSrcDir(), 'triggers', 'testersonSource.trigger');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Source: Save Trigger fail', async () => {
    await addErrorToDoc();
  });

  test('Source: Save Trigger pass', async () => {
    await removeErrorOnDoc();
  });

  test('Source: Creates LWC Component', async () => {
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
          return callback('theLWCTestSource'); // name of component
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      let output = path.join(getSrcDir(), 'lwc', 'theLWCTestSource');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Source: Save LWC fail', async () => {
    await addErrorToDoc();
  });

  test('Source: Creates LWC Component 2', async () => {
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
          return callback('theLWCTest2Source'); // name of component
        },
      };
    });
    createForceJson(process.env.SF_USERNAME || '', true); // turn on autoCompile
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      let output = path.join(getSrcDir(), 'lwc', 'theLWCTest2Source');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Source: Save LWC pass', async () => {
    // indicate we shouldn't try and remove an error, and that autoCompile is on
    await removeErrorOnDoc(true, true);
  });

  test('Source: Creates Lightning Message Channel', async () => {
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
          return callback('MyMessageChannelSource'); // name of component
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      let output = path.join(
        getSrcDir(),
        'messageChannels',
        'MyMessageChannelSource.messageChannel'
      );
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Source: Save Lightning Message Channel fail', async () => {
    await addErrorToDoc();
  });

  test('Source: Creates Lightning Message Channel 2', async () => {
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
          return callback('MyMessageChannel2Source'); // name of component
        },
      };
    });
    createForceJson(process.env.SF_USERNAME || '', true); // turn on autoCompile
    return await vscode.commands.executeCommand('ForceCode.createClass').then((_res) => {
      let output = path.join(
        getSrcDir(),
        'messageChannels',
        'MyMessageChannel2Source.messageChannel'
      );
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Source: Save Lightning Message Channel pass', async () => {
    // indicate we shouldn't try and remove an error, and that autoCompile is on
    await removeErrorOnDoc(true, true);
  });

  test('Source: Test multi-save', async () => {
    // indicate we shouldn't try and remove an error, and that autoCompile is on
    removeErrorOnDoc(true, true);
    await timeout(1000);
    await removeErrorOnDoc(true, true);
  });

  test('Source: Verify Code Coverage view now has contents', async () => {
    return assert.strictEqual(codeCovViewService.getChildren().length > 0, true);
  });

  test('Source: Check for file changes', async () => {
    return await vscode.commands.executeCommand('ForceCode.checkForFileChanges').then((_res) => {
      return assert.strictEqual(true, true);
    });
  });
});
