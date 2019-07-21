import * as vscode from 'vscode';
import { getFileName, getFileExtension } from '../parsers';

const COMMAND: string = 'command:ForceCode.runTests';

export class ApexTestLinkProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    var wordPosition = document.getWordRangeAtPosition(position);
    if (!wordPosition || wordPosition.start.character === 0)
      return new Promise(resolve => resolve());
    wordPosition = wordPosition.with(
      wordPosition.start.with(wordPosition.start.line, wordPosition.start.character - 1)
    );
    const word = document
      .getText(wordPosition)
      .trim()
      .toLowerCase();
    if (word === '@istest' || word === 'testmethod') {
      var fileContents = document.getText();
      var fileName = getFileName(document);
      var runText: string = 'all tests in ' + fileName + '.' + getFileExtension(document);
      var wordIndex: number = document.offsetAt(position);
      // get the index of the first '{' after the position
      var bracketIndex: number = fileContents.indexOf('{', wordIndex);
      if (bracketIndex > wordIndex) {
        var args = { name: fileName, type: 'class' };
        // get the text up till the bracket so we can see if it's a class
        var lineText: string = fileContents.slice(wordIndex, bracketIndex);
        if (!lineText.toLowerCase().includes('class')) {
          // this means it's a method
          var methodName: string | undefined = lineText
            .slice(0, lineText.lastIndexOf('('))
            .trimRight()
            .split(' ')
            .pop();
          args.name += '.' + methodName;
          args.type = 'method';
          runText = methodName + ' test method';
        }
        var md: vscode.MarkdownString = new vscode.MarkdownString(
          'Click [here](' + encodeURI(`${COMMAND}?` + JSON.stringify(args)) + ')  to run ' + runText
        );
        md.isTrusted = true;
        return new vscode.Hover(['ForceCode: Run test', md]);
      }
    }
    return new Promise(resolve => resolve());
  }
}
