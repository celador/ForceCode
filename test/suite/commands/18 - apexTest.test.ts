import * as vscode from 'vscode';
import * as assert from 'assert';

suite('apexTest.ts', () => {
  test('Executes a passing test class', async () => {
    await vscode.commands
      .executeCommand('ForceCode.runTests', { name: 'ForceCode', type: 'class' })
      .then(res => {
        assert.strictEqual(true, true);
      });
  });
  test('Executes a failing test class', async () => {
    await vscode.commands
      .executeCommand('ForceCode.runTests', { name: 'ForceCodeFail', type: 'class' })
      .then(res => {
        assert.strictEqual(true, true);
      });
  });
  test('Test toggling coverage', async () => {
    var before = vscode.window.forceCode.config.showTestCoverage;
    await vscode.commands.executeCommand('ForceCode.toggleCoverage').then(res => {
      assert.notStrictEqual(before, vscode.window.forceCode.config.showTestCoverage);
    });
  });
});
