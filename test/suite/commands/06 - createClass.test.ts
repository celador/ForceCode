import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as path from 'path';
import * as fs from 'fs';
import { afterEach, beforeEach } from 'mocha';
import { codeCovViewService } from '../../../src/services';
import { addErrorToDoc, removeErrorOnDoc } from '../../testUtils/utils.test';

suite('createClass.ts', () => {
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    sandbox.stub(vscode.window, 'showWarningMessage').returns({
      async then(callback) {
        return callback('Overwrite'); // LWC component
      },
    });
  });
  afterEach(() => {
    sandbox.restore();
  });

  test('Creates new class', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback(items[1]); // apex class
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function(options) {
      return {
        async then(callback) {
          return callback('testerson'); // name of class
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then(res => {
      // verify the file was created
      var output = path.join(vscode.window.forceCode.projectRoot, 'classes', 'testerson.cls');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save class fail', async () => {
    await addErrorToDoc(sandbox);
  });

  test('Save class pass', async () => {
    await removeErrorOnDoc(sandbox);
  });

  test('Creates Visualforce Page', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback(items[4]); // VF page
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function(options) {
      return {
        async then(callback) {
          return callback('testerson'); // name of VF page
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then(res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'pages', 'testerson.page');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save VF page fail', async () => {
    await addErrorToDoc(sandbox);
  });

  test('Save VF page pass', async () => {
    await removeErrorOnDoc(sandbox);
  });

  test('Creates Visualforce Component', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback(items[5]); // VF component
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function(options) {
      return {
        async then(callback) {
          return callback('testerson'); // name of component
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then(res => {
      var output = path.join(
        vscode.window.forceCode.projectRoot,
        'components',
        'testerson.component'
      );
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save VF component fail', async () => {
    await addErrorToDoc(sandbox);
  });

  test('Save VF component pass', async () => {
    await removeErrorOnDoc(sandbox);
  });

  test('Creates Aura App', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback(items[0]); // Aura, app
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function(options) {
      return {
        async then(callback) {
          return callback('testersonAura'); // name of Aura app
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then(res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'aura', 'testersonAura');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save Aura app fail', async () => {
    await addErrorToDoc(sandbox);
  });

  test('Save Aura app pass', async () => {
    await removeErrorOnDoc(sandbox);
  });

  test('Creates Trigger on Account', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback(items[3]); // Trigger
        },
      };
    });
    var inputStub = sandbox
      .stub(vscode.window, 'showInputBox')
      .onFirstCall()
      .callsFake(function(options) {
        return {
          async then(callback) {
            return callback('testerson'); // name of Trigger
          },
        };
      });
    inputStub.onSecondCall().callsFake(function(options) {
      return {
        async then(callback) {
          return callback('Account'); // Trigger is on Object Account
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then(res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'triggers', 'testerson.trigger');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save Trigger fail', async () => {
    await addErrorToDoc(sandbox);
  });

  test('Save Trigger pass', async () => {
    await removeErrorOnDoc(sandbox);
  });

  test('Creates LWC Component', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback(items[2]); // LWC component
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function(options) {
      return {
        async then(callback) {
          return callback('theLWCTest'); // name of component
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then(res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'lwc', 'theLWCTest');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save LWC fail', async () => {
    await addErrorToDoc(sandbox);
  });

  test('Creates LWC Component 2', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback(items[2]); // LWC component
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function(options) {
      return {
        async then(callback) {
          return callback('theLWCTest'); // name of component
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.createClass').then(res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'lwc', 'theLWCTest');
      return assert.strictEqual(fs.existsSync(output), true);
    });
  });

  test('Save LWC pass', async () => {
    await removeErrorOnDoc(sandbox, true);
  });

  test('Verify Code Coverage view now has contents', async () => {
    return assert.strictEqual(codeCovViewService.getChildren().length > 0, true);
  });
});
