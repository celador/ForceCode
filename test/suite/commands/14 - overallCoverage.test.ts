import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { getSrcDir } from '../../../src/services/configuration';

suite('overallCoverage.ts', () => {
  test('Gets overall coverage', async () => {
    await vscode.commands.executeCommand('ForceCode.getOverallCoverage').then((_res) => {
      let output = path.join(getSrcDir(), 'coverage');
      assert.strictEqual(fs.existsSync(output), true);
    });
  });
});
