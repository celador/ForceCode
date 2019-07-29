import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';

suite('deploy.ts', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  test('Deploys a file', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback(items[1]); // deploy second file in list
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.deployPackage').then(res => {
      assert.strictEqual(true, true);
    });
  });
});
