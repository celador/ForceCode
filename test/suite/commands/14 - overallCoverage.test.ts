import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

suite('overallCoverage.ts', () => {
  test('Gets overall coverage', async () => {
    await vscode.commands.executeCommand('ForceCode.getOverallCoverage').then(res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'coverage');
      assert.strictEqual(fs.existsSync(output), true);
    });
  });
});
