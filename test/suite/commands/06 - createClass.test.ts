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
    await vscode.commands.executeCommand('ForceCode.createClass').then(res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'classes', 'testerson.cls');
      assert.strictEqual(fs.existsSync(output), true);
    });
  });
  test('Creates Visualforce Page', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback(items[4]); // apex class
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
    await vscode.commands.executeCommand('ForceCode.createClass').then(res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'pages', 'testerson.page');
      assert.strictEqual(fs.existsSync(output), true);
    });
  });
  test('Creates Visualforce Component', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback(items[5]); // apex class
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
    await vscode.commands.executeCommand('ForceCode.createClass').then(res => {
      var output = path.join(
        vscode.window.forceCode.projectRoot,
        'components',
        'testerson.component'
      );
      assert.strictEqual(fs.existsSync(output), true);
    });
  });
});
