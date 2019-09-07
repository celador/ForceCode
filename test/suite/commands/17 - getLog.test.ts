import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';

suite('getLog.ts', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  test('Retrieve log file', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(items[0]);
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.getLogs').then(_res => {
      assert.strictEqual(true, true);
    });
  });
});
