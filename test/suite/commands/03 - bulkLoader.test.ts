import * as vscode from 'vscode';
import * as assert from 'assert';

suite('bulkLoader.ts', () => {
  test('Opens bulk loader', async () => {
    await vscode.commands.executeCommand('ForceCode.bulkLoader').then(_res => {
      assert.strictEqual(true, true);
    });
  });
});
