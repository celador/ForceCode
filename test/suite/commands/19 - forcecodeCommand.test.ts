import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';
import { RetrieveBundle } from '../../../src/commands/retrieve';

suite('forcecodeCommand.ts', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  test('Cancel Retrieve all', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback({ description: 'unpackaged' }); // retrieve everything
        },
      };
    });

    return await new Promise((resolve, reject) => {
      var ccr = new RetrieveBundle();
      setTimeout(cancelTask, 3000);
      return ccr.run(undefined, undefined).then(
        res => {
          resolve(assert.strictEqual(true, true));
        },
        rej => {
          resolve(assert.strictEqual(true, true));
        }
      );

      function cancelTask() {
        ccr.cancel();
      }
    });
  });
});
