import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';
import { CodeCompletionRefresh } from '../../../src/commands/codeCompletionRefresh';

suite('forcecodeCommand.ts', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  test('Cancel Refresh code completion', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback(items[0]); // refresh all
        },
      };
    });
    var ccr = new CodeCompletionRefresh();

    return await new Promise((resolve, reject) => {
      Promise.resolve(ccr.run(undefined, undefined)).then(
        () => {
          // should not resolve
          resolve(assert.strictEqual(true, false));
        },
        () => {
          resolve(assert.strictEqual(true, true));
        }
      );
      setTimeout(cancelTask, 2000);
    });

    function cancelTask() {
      ccr.cancel();
    }
  });
});
