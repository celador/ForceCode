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
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(_items, _options) {
      return {
        async then(callback: any) {
          return callback({ description: 'unpackaged' }); // retrieve everything
        },
      };
    });

    return await new Promise((resolve, _reject) => {
      var ccr = new RetrieveBundle();
      setTimeout(cancelTask, 3000);
      return ccr.run(undefined, undefined).then(
        (_res: any) => {
          resolve(assert.strictEqual(true, true));
        },
        (_rej: any) => {
          resolve(assert.strictEqual(true, true));
        }
      );

      function cancelTask() {
        ccr.cancel();
      }
    });
  });
});
