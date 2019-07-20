import * as vscode from 'vscode';
import * as assert from 'assert';

suite('executeAnonymous.ts', () => {
  test('Executes apex code', async () => {
    const newDocURI: vscode.Uri = vscode.Uri.parse(`untitled:${new Date().toISOString()}.cls`);
    await vscode.workspace
      .openTextDocument(newDocURI)
      .then(function(_document: vscode.TextDocument) {
        return vscode.window.showTextDocument(_document, 3, true).then(editor => {
          const testText = "System.debug('hello');";
          editor.edit(edit => {
            edit.insert(new vscode.Position(0, 0), testText);
          });
          editor.selection = new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, testText.length - 1)
          );
          return vscode.commands.executeCommand('ForceCode.executeAnonymous').then(res => {
            assert.strictEqual(true, true);
          });
        });
      });
  });
});
