import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { dxService } from '../../src/services';
import { before, after } from 'mocha';
import { createForceJson, removeProjectFiles, executeSFDXCommand } from '../testUtils/utils.test';
import * as path from 'path';
import * as fs from 'fs';

suite('Extension Tests', () => {
  const sandbox = sinon.createSandbox();
  before(() => {
    if (!process.env.SF_USERNAME) {
      sandbox.stub(dxService, 'runCommand').callsFake(executeSFDXCommand);
    }
    createForceJson(process.env.SF_USERNAME);
  });
  after(() => {
    sandbox.restore();
    removeProjectFiles();
  });
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
  test('Opens bulk loader', async () => {
    await vscode.commands.executeCommand('ForceCode.bulkLoader').then(res => {
      assert.strictEqual(true, true);
    });
  });
  test('Opens query editor', async () => {
    await vscode.commands.executeCommand('ForceCode.queryEditor').then(res => {
      assert.strictEqual(true, true);
    });
  });
  test('Opens settings', async () => {
    await vscode.commands.executeCommand('ForceCode.settings').then(res => {
      assert.strictEqual(true, true);
    });
  });
  test('Gets overall coverage', async () => {
    await vscode.commands.executeCommand('ForceCode.getOverallCoverage').then(res => {
      var output = path.join(vscode.window.forceCode.projectRoot, 'coverage');
      assert.strictEqual(true, fs.existsSync(output));
    });
  });
});
