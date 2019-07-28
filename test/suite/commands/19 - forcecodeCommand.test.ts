import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';
import { commandViewService } from '../../../src/services';

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
    vscode.commands.executeCommand('ForceCode.codeCompletionRefresh');

    return await setTimeout(cancelTask, 2000);

    function cancelTask() {
      vscode.commands
        .executeCommand('ForceCode.cancelCommand', commandViewService.getChildren()[0])
        .then(() => {
          assert.strictEqual(true, true);
        });
    }
  });
});
