import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';
import * as fs from 'fs-extra';
import * as path from 'path';
import { timeout } from '../../testUtils/utils.test';

suite('retrieve.ts', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  test('Retrieve via package.xml', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(_items, _options) {
      return {
        async then(callback: any) {
          return callback({ description: 'packaged' }); // retrieve from package.xml
        },
      };
    });
    await vscode.commands.executeCommand('ForceCode.retrievePackage').then(_res => {
      assert.strictEqual(true, true);
    });
  });

  test('Retrieve all Apex Classes', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(_items, _options) {
      return {
        async then(callback: any) {
          return callback({ description: 'apexclasses' }); // retrieve everything
        },
      };
    });
    const apexPath = path.join(vscode.window.forceCode.projectRoot, 'classes');
    if (fs.existsSync(apexPath)) {
      fs.removeSync(apexPath);
    }
    await vscode.commands.executeCommand('ForceCode.retrievePackage').then(async _res => {
      await timeout(3000); // give the system time to catch up
      assert.strictEqual(fs.existsSync(apexPath), true);
    });
  });

  test('Retrieve all Custom Objects', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(_items, _options) {
      return {
        async then(callback: any) {
          return callback({ description: 'customobj' }); // retrieve everything
        },
      };
    });
    const objectPath = path.join(vscode.window.forceCode.projectRoot, 'objects');
    if (fs.existsSync(objectPath)) {
      fs.removeSync(objectPath);
    }
    await vscode.commands.executeCommand('ForceCode.retrievePackage').then(async _res => {
      await timeout(3000); // give the system time to catch up
      assert.strictEqual(fs.existsSync(objectPath), true);
    });
  });

  test('Retrieve all', async () => {
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(_items, _options) {
      return {
        async then(callback: any) {
          return callback({ description: 'unpackaged' }); // retrieve everything
        },
      };
    });
    const pSetPath = path.join(vscode.window.forceCode.projectRoot, 'permissionsets');
    if (fs.existsSync(pSetPath)) {
      fs.removeSync(pSetPath);
    }
    await vscode.commands.executeCommand('ForceCode.retrievePackage').then(async _res => {
      await timeout(3000); // give the system time to catch up
      assert.strictEqual(fs.existsSync(pSetPath), true);
    });
  });
});
