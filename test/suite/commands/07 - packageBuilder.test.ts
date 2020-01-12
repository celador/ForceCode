import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';
import { timeout } from '../../testUtils/utils.test';

suite('packageBuilder.ts', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  test('Builds package.xml', async () => {
    const output = path.join(vscode.window.forceCode.projectRoot, 'package.xml');
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items, _options) {
      return {
        async then(callback: any) {
          return callback(items); // apex class
        },
      };
    });
    sandbox.stub(vscode.window, 'showSaveDialog').callsFake(function(_items) {
      return {
        async then(callback: any) {
          return callback(vscode.Uri.file(output)); // apex class
        },
      };
    });
    if (fs.existsSync(output)) {
      fs.removeSync(output);
    }
    await vscode.commands.executeCommand('ForceCode.buildPackage').then(async _res => {
      await timeout(3000); // give the system time to catch up
      assert.strictEqual(fs.existsSync(output), true);
    });
  });
});
