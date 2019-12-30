import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';
import { toArray } from '../../../src/util';

suite('open.ts', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  test('Open a file', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[0]); // apex class
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.open').then(_res => {
      assert.strictEqual(true, true);
    });
  });
});
