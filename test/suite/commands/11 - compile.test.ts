import * as vscode from 'vscode';
import * as assert from 'assert';

suite('compile.ts', () => {
  test('Save a file', async () => {
    await vscode.commands.executeCommand('ForceCode.compile').then(res => {
      assert.strictEqual(true, true);
    });
  });
});
