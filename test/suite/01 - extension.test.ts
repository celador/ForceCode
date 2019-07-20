import * as assert from 'assert';
import * as vscode from 'vscode';

suite('extension.ts', () => {
  test('Activates the extension', async () => {
    // test extension load
    const ext = vscode.extensions.getExtension('JohnAaronNelson.forcecode');
    if (ext) {
      await ext.activate();
      await vscode.commands.executeCommand('ForceCode.showMenu').then(res => {
        assert.strictEqual(true, true);
      });
    } else {
      assert.strictEqual(true, false);
    }
  });
});
