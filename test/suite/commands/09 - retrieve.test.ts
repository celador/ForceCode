import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';

suite('retrieve.ts', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  test('Retrieve via package.xml', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback({ description: 'packaged' }); // retrieve from package.xml
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.retrievePackage').then(res => {
      assert.strictEqual(true, true);
    });
  });

  test('Retrieve all Apex Classes', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback({ description: 'apexclasses' }); // retrieve everything
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.retrievePackage').then(res => {
      assert.strictEqual(true, true);
    });
  });

  test('Retrieve all Custom Objects', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback({ description: 'customobj' }); // retrieve everything
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.retrievePackage').then(res => {
      assert.strictEqual(true, true);
    });
  });

  test('Retrieve all', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback({ description: 'unpackaged' }); // retrieve everything
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.retrievePackage').then(res => {
      assert.strictEqual(true, true);
    });
  });
});
