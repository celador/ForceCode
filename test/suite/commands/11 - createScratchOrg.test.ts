import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { dxService } from '../../../src/services';
import { afterEach, beforeEach } from 'mocha';
import { toArray } from '../../../src/util';

suite('createScratchOrg.ts', () => {
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    sandbox.stub(dxService, 'createScratchOrg').returns(
      Promise.resolve({
        orgId: '00D1N00000AAAAAAAA',
        username: 'test@test.com',
      })
    );
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[0]);
        },
      };
    });
  });
  afterEach(() => {
    sandbox.restore();
  });

  test('Calls to create scratch org', async () => {
    await vscode.commands.executeCommand('ForceCode.createScratchOrg').then(_res => {
      assert.strictEqual(true, true);
    });
  });
});
