import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { dxService } from '../../src/services';
import { before, after } from 'mocha';
import { createForceJson, removeProjectFiles, executeSFDXCommand } from '../testUtils/utils.test';

suite('Extension Tests', () => {
  const sandbox = sinon.createSandbox();
  before(() => {
    sandbox.stub(dxService, 'runCommand').callsFake(executeSFDXCommand);
    createForceJson();
  });
  after(() => {
    sandbox.restore();
    removeProjectFiles();
  });
  test('Activates the extension', async () => {
    // test extension load
    const ext = vscode.extensions.getExtension('JohnAaronNelson.forcecode');
    if (ext) {
      // TODO: add connection to dev org to test login
      await ext.activate().then(async () => {
        assert.strictEqual(true, true);
      });
    } else {
      assert.strictEqual(true, false);
    }
  });
});
