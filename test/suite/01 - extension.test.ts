import * as assert from 'assert';
import * as vscode from 'vscode';
import { fcConnection } from '../../src/services';

suite('extension.ts', () => {
  test('Activates the extension', async () => {
    // test extension load
    const ext = vscode.extensions.getExtension('JohnAaronNelson.forcecode');
    if (ext) {
      await ext.activate();
      return await vscode.commands.executeCommand('ForceCode.showMenu').then(async res => {
        return await checkLogin();
      });
    } else {
      return assert.strictEqual(true, false);
    }

    function checkLogin() {
      if (fcConnection.isLoggedIn()) {
        assert.strictEqual(true, true);
      } else {
        setTimeout(checkLogin, 1000);
      }
    }
  });
});
