import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';

suite('packageBuilder.ts', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  test('Builds package.xml', async () => {
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
          var output = path.join(vscode.window.forceCode.projectRoot, 'package.xml');
          return callback(vscode.Uri.file(output)); // apex class
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.buildPackage').then(_res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'package.xml');
      assert.strictEqual(fs.existsSync(output), true);
    });
  });
});
