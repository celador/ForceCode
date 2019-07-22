import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'path';
import { afterEach } from 'mocha';
import { removeErrorOnDoc } from '../../testUtils/utils.test';

suite('retrieve.ts', () => {
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
        return removeErrorOnDoc(sandbox, true, true);
      });
    });
  });
});
