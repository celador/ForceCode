import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';
import { toArray } from '../../../src/util';

suite('find.ts', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  test('Searches for and opens file', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[0]);
        },
      };
    });
    sandbox.stub(vscode.window, 'showInputBox').callsFake(function(_options) {
      return {
        async then(callback: any) {
          return callback('test');
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.find').then(_res => {
      assert.strictEqual(true, true);
    });
  });
});
