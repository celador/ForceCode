import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';
import { toArray } from '../../../src/util';

suite('deploy.ts', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  test('Deploys a file', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[1]); // deploy second file in list
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.deployPackage').then(_res => {
      assert.strictEqual(true, true);
    });
  });
});
