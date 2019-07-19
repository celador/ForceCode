import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { dxService } from '../../src/services';
import { before, after } from 'mocha';
import { createForceJson, removeProjectFiles, executeSFDXCommand } from '../testUtils/utils.test';
import * as path from 'path';
import * as fs from 'fs';

suite('Extension Tests', () => {
  const sandbox = sinon.createSandbox();
  before(() => {
    if (!process.env.SF_USERNAME) {
      sandbox.stub(dxService, 'runCommand').callsFake(executeSFDXCommand);
    }
    createForceJson(process.env.SF_USERNAME);
  });
  after(() => {
    sandbox.restore();
    removeProjectFiles();
  });
  test('Activates the extension', async () => {
    // test extension load
    const ext = vscode.extensions.getExtension('JohnAaronNelson.forcecode');
    if (ext) {
      await ext.activate();
      await vscode.commands.executeCommand('ForceCode.showMenu').then(res => {
        assert.strictEqual(true, true);
      });
    } else {
      assert.strictEqual(true, false);
    }
  });
  test('Opens bulk loader', async () => {
    await vscode.commands.executeCommand('ForceCode.bulkLoader').then(res => {
      assert.strictEqual(true, true);
    });
  });
  test('Opens query editor', async () => {
    await vscode.commands.executeCommand('ForceCode.queryEditor').then(res => {
      assert.strictEqual(true, true);
    });
  });
  test('Opens settings', async () => {
    await vscode.commands.executeCommand('ForceCode.settings').then(res => {
      assert.strictEqual(true, true);
    });
  });
  test('Gets overall coverage', async () => {
    await vscode.commands.executeCommand('ForceCode.getOverallCoverage').then(res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'coverage');
      assert.strictEqual(fs.existsSync(output), true);
    });
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
      sandbox.restore();
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
      sandbox.restore();
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
      sandbox.restore();
    });
  });
  test('Builds package.xml', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback(items); // apex class
        },
      };
    });
    sandbox.stub(vscode.window, 'showSaveDialog').callsFake(function(items) {
      return {
        async then(callback) {
          var output = path.join(vscode.window.forceCode.projectRoot, 'package.xml');
          return callback(vscode.Uri.file(output)); // apex class
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.buildPackage').then(res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'package.xml');
      assert.strictEqual(fs.existsSync(output), true);
      sandbox.restore();
    });
  });
  test('Deploys a file', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback(items[1]); // apex class
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.deployPackage').then(res => {
      assert.strictEqual(true, true);
      sandbox.restore();
    });
  });
});
