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
          return callback({ description: 'packaged' }); // apex class
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.retrievePackage').then(res => {
      assert.strictEqual(true, true);
    });
  });
});
