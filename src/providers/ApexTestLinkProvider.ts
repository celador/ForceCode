import * as vscode from 'vscode';
import { getFileName, getFileExtension } from '../parsers';

const COMMAND: string = 'command:ForceCode.runTests';

export class ApexTestLinkProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    let wordPosition = document.getWordRangeAtPosition(position);
    if (!wordPosition || wordPosition.start.character === 0)
      return new Promise((resolve) => resolve(undefined));
    wordPosition = wordPosition.with(
      wordPosition.start.with(wordPosition.start.line, wordPosition.start.character - 1)
    );
    const word = document.getText(wordPosition).trim().toLowerCase();
    if (word === '@istest' || word === 'testmethod') {
      let fileContents = document.getText();
      let fileName = getFileName(document);
      let runText: string = 'all tests in ' + fileName + '.' + getFileExtension(document);
      let wordIndex: number = document.offsetAt(position);
      // get the index of the first '{' after the position
      let bracketIndex: number = fileContents.indexOf('{', wordIndex);
      if (bracketIndex > wordIndex) {
        let args = { name: fileName, type: 'class' };
        // get the text up till the bracket so we can see if it's a class
        let lineText: string = fileContents.slice(wordIndex, bracketIndex);
        if (!lineText.toLowerCase().includes('class')) {
          // this means it's a method
          let methodName: string | undefined = lineText
            .slice(0, lineText.lastIndexOf('('))
            .trimRight()
            .split(' ')
            .pop();
          args.name += '.' + methodName;
          args.type = 'method';
          runText = methodName + ' test method';
        }
        let md: vscode.MarkdownString = new vscode.MarkdownString(
          'Click [here](' + encodeURI(`${COMMAND}?` + JSON.stringify(args)) + ')  to run ' + runText
        );
        md.isTrusted = true;
        return new vscode.Hover(['ForceCode: Run test', md]);
      }
    }
    return new Promise((resolve) => resolve(undefined));
  }
}
