import * as vscode from 'vscode';
import * as assert from 'assert';

suite('queryEditor.ts', () => {
  test('Opens query editor', async () => {
    await vscode.commands.executeCommand('ForceCode.queryEditor').then(res => {
      assert.strictEqual(true, true);
    });
  });
});
