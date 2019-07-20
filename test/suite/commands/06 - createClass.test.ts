import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as path from 'path';
import * as fs from 'fs';
import { afterEach } from 'mocha';

suite('createClass.ts', () => {
  const sandbox = sinon.createSandbox();
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
    await vscode.commands.executeCommand('ForceCode.createClass').then(async res => {
      await vscode.commands.executeCommand('ForceCode.compile').then(res => {
        var output = path.join(vscode.window.forceCode.projectRoot, 'classes', 'testerson.cls');
        assert.strictEqual(fs.existsSync(output), true);
      });
    });
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
    await vscode.commands.executeCommand('ForceCode.createClass').then(async res => {
      await vscode.commands.executeCommand('ForceCode.compile').then(res => {
        var output = path.join(vscode.window.forceCode.projectRoot, 'pages', 'testerson.page');
        assert.strictEqual(fs.existsSync(output), true);
      });
    });
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
    await vscode.commands.executeCommand('ForceCode.createClass').then(async res => {
      await vscode.commands.executeCommand('ForceCode.compile').then(res => {
        var output = path.join(
          vscode.window.forceCode.projectRoot,
          'components',
          'testerson.component'
        );
        assert.strictEqual(fs.existsSync(output), true);
      });
    });
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
    await vscode.commands.executeCommand('ForceCode.createClass').then(async res => {
      await vscode.commands.executeCommand('ForceCode.compile').then(res => {
        var output = path.join(vscode.window.forceCode.projectRoot, 'aura', 'testersonAura');
        assert.strictEqual(fs.existsSync(output), true);
      });
    });
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
    await vscode.commands.executeCommand('ForceCode.createClass').then(async res => {
      await vscode.commands.executeCommand('ForceCode.compile').then(res => {
        var output = path.join(
          vscode.window.forceCode.projectRoot,
          'triggers',
          'testerson.trigger'
        );
        assert.strictEqual(fs.existsSync(output), true);
      });
    });
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
          return callback('testersonLWC'); // name of component
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.createClass').then(async res => {
      await vscode.commands.executeCommand('ForceCode.compile').then(res => {
        var output = path.join(vscode.window.forceCode.projectRoot, 'lwc', 'testersonLWC');
        assert.strictEqual(fs.existsSync(output), true);
      });
    });
  });
});
