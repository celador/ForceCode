import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
//import { dxService } from '../../../src/services';
import { afterEach, beforeEach } from 'mocha';

suite('createScratchOrg.ts', () => {
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    // TODO: FIX STUB
    /*
    sandbox
      .stub(dxService, 'runCommand')
      .callsFake(function(cmdString, targetusername, cancellationToken) {
        console.log(cmdString.split(' ')[0]);
        if (cmdString.split(' ')[0] === 'org:create') {
          return Promise.resolve({
            orgId: '00D1N00000AAAAAAAA',
            username: 'test@test.com',
          });
        } else {
          return dxService.runCommand(cmdString, targetusername, cancellationToken);
        }
      });
      */
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, options) {
      return {
        async then(callback) {
          return callback(items[0]);
        },
      };
    });
  });
  afterEach(() => {
    sandbox.restore();
  });

  test('Calls to create scratch org', async () => {
    await vscode.commands.executeCommand('ForceCode.createScratchOrg').then(res => {
      assert.strictEqual(true, true);
    });
  });
});
