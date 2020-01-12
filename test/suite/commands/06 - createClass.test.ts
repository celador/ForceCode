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
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[1]); // apex class
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function(_options) {
      return {
        async then(callback: any) {
          return callback('testerson'); // name of class
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then(_res => {
      // verify the file was created
      var output = path.join(vscode.window.forceCode.projectRoot, 'classes', 'testerson.cls');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save class fail', async () => {
    await addErrorToDoc();
  });

  test('Save class pass', async () => {
    await removeErrorOnDoc();
  });

  test('Refresh class', async () => {
    var output = path.join(vscode.window.forceCode.projectRoot, 'classes', 'testerson.cls');
    // get the mTime for the file
    const mTime = fs.statSync(output).mtimeMs;
    return await vscode.workspace.openTextDocument(output).then(doc => {
      return vscode.commands
        .executeCommand('ForceCode.refresh', undefined, [doc.uri])
        .then(_res => {
          // make sure the file actually refreshed
          return assert.notStrictEqual(mTime, fs.statSync(output).mtimeMs);
        });
    });
  });

  test('Open file (class) in the org', async () => {
    var output = path.join(vscode.window.forceCode.projectRoot, 'classes', 'testerson.cls');
    return await vscode.workspace.openTextDocument(output).then(doc => {
      return vscode.commands.executeCommand('ForceCode.openFileInOrg', doc.uri).then(_res => {
        return assert.strictEqual(true, true);
      });
    });
  });

  test('Saves class metadata fail', async () => {
    // open the testerson class metadata
    var output = path.join(
      vscode.window.forceCode.projectRoot,
      'classes',
      'testerson.cls-meta.xml'
    );
    await vscode.workspace.openTextDocument(output).then(doc => {
      return vscode.window.showTextDocument(doc).then(() => {
        // edit the doc to fail
        return addErrorToDoc();
      });
    });
  });

  test('Saves class metadata pass', async () => {
    // doc will already be active from the above test
    await removeErrorOnDoc();
  });

  test('Creates Visualforce Page', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[5]); // VF page
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function(_options) {
      return {
        async then(callback: any) {
          return callback('testerson'); // name of VF page
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then(_res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'pages', 'testerson.page');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save VF page fail', async () => {
    await addErrorToDoc();
  });

  test('Save VF page pass', async () => {
    await removeErrorOnDoc();
  });

  test('Opens org via ForceCode menu', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[0]); // Open org option
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.showMenu').then(_res => {
      return assert.strictEqual(true, true);
    });
  });

  test('Preview VF', async () => {
    var output = path.join(vscode.window.forceCode.projectRoot, 'pages', 'testerson.page');
    return await vscode.workspace.openTextDocument(output).then(doc => {
      return vscode.commands.executeCommand('ForceCode.previewVF', doc.uri).then(_res => {
        return assert.strictEqual(true, true);
      });
    });
  });

  test('Creates Visualforce Component', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[6]); // VF component
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function(_options) {
      return {
        async then(callback: any) {
          return callback('testerson'); // name of component
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then(_res => {
      var output = path.join(
        vscode.window.forceCode.projectRoot,
        'components',
        'testerson.component'
      );
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save VF component fail', async () => {
    await addErrorToDoc();
  });

  test('Save VF component pass', async () => {
    await removeErrorOnDoc();
  });

  test('Delete VF component', async () => {
    sandbox.restore();
    sandbox
      .stub(vscode.window, 'showWarningMessage')
      .callsFake(function(
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
      .callsFake(function(
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
    return await vscode.commands.executeCommand('ForceCode.deleteFile').then(_res => {
      var output = path.join(
        vscode.window.forceCode.projectRoot,
        'components',
        'testerson.component'
      );
      return assert.strictEqual(fs.existsSync(output), false);
    });
  });

  test('Creates Aura App', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[0]); // Aura, app
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function(_options) {
      return {
        async then(callback: any) {
          return callback('testersonAura'); // name of Aura app
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then(_res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'aura', 'testersonAura');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save Aura app fail', async () => {
    await addErrorToDoc();
  });

  test('Save Aura app pass', async () => {
    await removeErrorOnDoc();
  });

  test('Preview Aura app', async () => {
    var output = path.join(
      vscode.window.forceCode.projectRoot,
      'aura',
      'testersonAura',
      'testersonAura.app'
    );
    return await vscode.workspace.openTextDocument(output).then(doc => {
      return vscode.commands.executeCommand('ForceCode.previewApp', doc.uri).then(_res => {
        return assert.strictEqual(true, true);
      });
    });
  });

  test('Delete Aura app DOCUMENTATION', async () => {
    sandbox.restore();
    sandbox
      .stub(vscode.window, 'showWarningMessage')
      .callsFake(function(
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
      .callsFake(function(
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
    var output = path.join(
      vscode.window.forceCode.projectRoot,
      'aura',
      'testersonAura',
      'testersonAura.auradoc'
    );
    return await vscode.workspace.openTextDocument(output).then(doc => {
      return vscode.commands.executeCommand('ForceCode.deleteFile', doc.uri).then(_res => {
        return assert.strictEqual(fs.existsSync(output), false);
      });
    });
  });

  test('Delete Aura app', async () => {
    sandbox.restore();
    sandbox
      .stub(vscode.window, 'showWarningMessage')
      .callsFake(function(
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
      .callsFake(function(
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
    var output = path.join(
      vscode.window.forceCode.projectRoot,
      'aura',
      'testersonAura',
      'testersonAura.app'
    );
    return await vscode.workspace.openTextDocument(output).then(doc => {
      return vscode.commands.executeCommand('ForceCode.deleteFile', doc.uri).then(_res => {
        return assert.strictEqual(fs.existsSync(output), false);
      });
    });
  });

  test('Creates Trigger on Account', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[4]); // Trigger
        },
      };
    });
    var inputStub = sandbox
      .stub(vscode.window, 'showInputBox')
      .onFirstCall()
      .callsFake(function(_options) {
        return {
          async then(callback: any) {
            return callback('testerson'); // name of Trigger
          },
        };
      });
    inputStub.onSecondCall().callsFake(function(_options) {
      return {
        async then(callback: any) {
          return callback('Account'); // Trigger is on Object Account
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then(_res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'triggers', 'testerson.trigger');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save Trigger fail', async () => {
    await addErrorToDoc();
  });

  test('Save Trigger pass', async () => {
    await removeErrorOnDoc();
  });

  test('Creates LWC Component', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[3]); // LWC component
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function(_options) {
      return {
        async then(callback: any) {
          return callback('theLWCTest'); // name of component
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then(_res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'lwc', 'theLWCTest');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save LWC fail', async () => {
    await addErrorToDoc();
  });

  test('Creates LWC Component 2', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[3]); // LWC component
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function(_options) {
      return {
        async then(callback: any) {
          return callback('theLWCTest2'); // name of component
        },
      };
    });
    createForceJson(process.env.SF_USERNAME || '', true); // turn on autoCompile
    return await vscode.commands.executeCommand('ForceCode.createClass').then(_res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'lwc', 'theLWCTest2');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save LWC pass', async () => {
    // indicate we shouldn't try and remove an error, and that autoCompile is on
    await removeErrorOnDoc(true, true);
  });

  test('Creates Lightning Message Channel', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[2]); // Lightning Message Channel
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function(_options) {
      return {
        async then(callback: any) {
          return callback('MyMessageChannel'); // name of component
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then(_res => {
      var output = path.join(
        vscode.window.forceCode.projectRoot,
        'messageChannels',
        'MyMessageChannel.messageChannel'
      );
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save Lightning Message Channel fail', async () => {
    await addErrorToDoc();
  });

  test('Creates Lightning Message Channel 2', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[2]); // Lightning Message Channel
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function(_options) {
      return {
        async then(callback: any) {
          return callback('MyMessageChannel2'); // name of component
        },
      };
    });
    createForceJson(process.env.SF_USERNAME || '', true); // turn on autoCompile
    return await vscode.commands.executeCommand('ForceCode.createClass').then(_res => {
      var output = path.join(
        vscode.window.forceCode.projectRoot,
        'messageChannels',
        'MyMessageChannel2.messageChannel'
      );
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save Lightning Message Channel pass', async () => {
    // indicate we shouldn't try and remove an error, and that autoCompile is on
    await removeErrorOnDoc(true, true);
  });

  test('Test multi-save', async () => {
    // indicate we shouldn't try and remove an error, and that autoCompile is on
    removeErrorOnDoc(true, true);
    await timeout(1000);
    await removeErrorOnDoc(true, true);
  });

  test('Verify Code Coverage view now has contents', async () => {
    return assert.strictEqual(codeCovViewService.getChildren().length > 0, true);
  });

  test('Check for file changes', async () => {
    return await vscode.commands.executeCommand('ForceCode.checkForFileChanges').then(_res => {
      return assert.strictEqual(true, true);
    });
  });
});
