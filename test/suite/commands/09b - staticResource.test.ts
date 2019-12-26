import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as path from 'path';
import { afterEach } from 'mocha';
import { removeErrorOnDoc } from '../../testUtils/utils.test';
import { toArray } from '../../../src/util';

suite('staticResource.ts', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  test('Save static resource zip (auto-compile)', async () => {
    var output = path.join(
      vscode.window.forceCode.projectRoot,
      'resource-bundles',
      'SiteSamples.resource.application.zip',
      'SiteStyles.css'
    );
    return await vscode.workspace.openTextDocument(output).then(doc => {
      return vscode.window.showTextDocument(doc).then(() => {
        // open the SiteStyles.css file, edit, then save
        return removeErrorOnDoc(true, true);
      });
    });
  });

  test('Refresh static resource', async () => {
    var output = path.join(
      vscode.window.forceCode.projectRoot,
      'resource-bundles',
      'SiteSamples.resource.application.zip',
      'SiteStyles.css'
    );
    return await vscode.workspace.openTextDocument(output).then(doc => {
      return vscode.commands
        .executeCommand('ForceCode.refresh', undefined, [doc.uri])
        .then(_res => {
          return assert.strictEqual(true, true);
        });
    });
  });

  test('Static resource deploy all', async () => {
    // call 'ForceCode.staticResource', stub choice to be the last (all)
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[toArray(items).length - 1]);
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.staticResource').then(_res => {
      return assert.strictEqual(true, true);
    });
  });

  test('Static resource deploy first', async () => {
    // call 'ForceCode.staticResource', stub choice to be the first
    sandbox.stub(vscode.window, 'showQuickPick').callsFake(function(items: any, _options) {
      return {
        async then(callback: any) {
          return callback(toArray(items)[0]);
        },
      };
    });
    return await vscode.commands.executeCommand('ForceCode.staticResource').then(_res => {
      return assert.strictEqual(true, true);
    });
  });
});
