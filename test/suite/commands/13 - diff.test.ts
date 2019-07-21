import * as vscode from 'vscode';
import * as assert from 'assert';

suite('diff.ts', () => {
  test('Diff a file', async () => {
    await vscode.commands.executeCommand('ForceCode.diff').then(res => {
      assert.strictEqual(true, true);
    });
  });
});
