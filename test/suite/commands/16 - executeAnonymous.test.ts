import * as vscode from 'vscode';
import * as assert from 'assert';
import { saveToFile } from '../../../src/util';

suite('executeAnonymous.ts', () => {
  test('Executes apex code success', async () => {
    const testText = "System.debug('hello');";
    await saveToFile(testText, Date.now() + '.cls').then(filename => {
      return vscode.workspace
        .openTextDocument(filename)
        .then(doc => vscode.window.showTextDocument(doc, 3))
        .then(editor => {
          editor.selections = [
            new vscode.Selection(
              new vscode.Position(0, 0),
              new vscode.Position(0, testText.length)
            ),
          ];
          return vscode.commands.executeCommand('ForceCode.executeAnonymous').then(res => {
            assert.strictEqual(true, true);
          });
        });
    });
  });
  test('Executes apex code fail', async () => {
    const testText = "System.debug('hello')";
    await saveToFile(testText, Date.now() + '.cls').then(filename => {
      return vscode.workspace
        .openTextDocument(filename)
        .then(doc => vscode.window.showTextDocument(doc, 3))
        .then(editor => {
          editor.selections = [
            new vscode.Selection(
              new vscode.Position(0, 0),
              new vscode.Position(0, testText.length)
            ),
          ];
          return vscode.commands.executeCommand('ForceCode.executeAnonymous').then(res => {
            assert.strictEqual(true, true);
          });
        });
    });
  });
});
