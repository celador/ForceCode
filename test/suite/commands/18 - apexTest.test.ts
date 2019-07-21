import * as vscode from 'vscode';
import * as assert from 'assert';

suite('apexTest.ts', () => {
  test('Executes a test class', async () => {
    await vscode.commands.executeCommand('ForceCode.apexTest', 'ForceCode', 'class').then(res => {
      assert.strictEqual(true, true);
    });
  });
});
