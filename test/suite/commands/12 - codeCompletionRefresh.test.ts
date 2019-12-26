import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';
import { toArray } from '../../../src/util';

suite('codeCompletionRefresh.ts', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  test('Refresh code completion', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[0]); // refresh all
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.codeCompletionRefresh').then(_res => {
      assert.strictEqual(true, true);
    });
  });
});
