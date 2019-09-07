import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';

suite('codeCompletionRefresh.ts', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  test('Refresh code completion', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, options) {
      return {
        async then(callback: any) {
          return callback(items[0]); // refresh all
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.codeCompletionRefresh').then(res => {
      assert.strictEqual(true, true);
    });
  });
});
