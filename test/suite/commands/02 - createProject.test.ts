import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'path';
import * as fs from 'fs-extra';
import { before, after } from 'mocha';
import { createProject } from '../../../src/commands/createProject';
import { createProjectDir } from '../../testUtils/utils.test';

suite('createProject.ts', () => {
  const sandbox = sinon.createSandbox();
  before(() => {
    sandbox
      .stub(vscode.window, 'showOpenDialog')
      .callsFake(function(options: vscode.OpenDialogOptions) {
        return {
          async then(callback) {
            const projectDir = createProjectDir();
            return callback(projectDir);
          },
        };
      });
    sandbox
      .stub(vscode.commands, 'executeCommand')
      .callsFake(function(command: string, ...rest: any[]) {
        return {
          async then(callback) {
            if (command === 'vscode.openFolder') {
              return callback();
            }
            return vscode.commands.executeCommand(command, rest);
          },
        };
      });
  });
  after(() => {
    sandbox.restore();
  });
  test('Creates a project', async () => {
    // test extension load
    await createProject().then(() => {
      if (vscode.workspace.workspaceFolders) {
        const forcePath = path.join(
          vscode.workspace.workspaceFolders[0].uri.fsPath,
          'test',
          'force.json'
        );
        assert.strictEqual(true, fs.existsSync(forcePath));
      }
    });
  });
});
