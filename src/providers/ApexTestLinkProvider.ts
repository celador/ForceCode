import * as vscode from 'vscode';
import { getFileName, getFileExtension } from '../parsers';

const COMMAND: string = 'command:ForceCode.runTests';

export class ApexTestLinkProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const wordPosition = document.getWordRangeAtPosition(position);
    if (!wordPosition || wordPosition.start.character === 0) {
      return Promise.resolve(undefined);
    }

    const adjustedWordPosition = wordPosition.with(
      wordPosition.start.with(wordPosition.start.line, wordPosition.start.character - 1)
    );
    const word = document.getText(adjustedWordPosition).trim().toLowerCase();

    if (word === '@istest' || word === 'testmethod') {
      const fileContents = document.getText();
      const fileName = getFileName(document);
      const fileExtension = getFileExtension(document);
      let runText = `all tests in ${fileName}.${fileExtension}`;
      const wordIndex = document.offsetAt(position);
      // get the index of the first '{' after the position
      const bracketIndex = fileContents.indexOf('{', wordIndex);

      if (bracketIndex > wordIndex) {
        let args = { name: fileName, type: 'class' };
        // get the text up till the bracket so we can see if it's a class
        const lineText = fileContents.slice(wordIndex, bracketIndex);

        if (!lineText.toLowerCase().includes('class')) {
          // this means it's a method
          const methodName = lineText
            .slice(0, lineText.lastIndexOf('('))
            .trimEnd()
            .split(' ')
            .pop();

          args.name += `.${methodName}`;
          args.type = 'method';
          runText = `${methodName} test method`;
        }

        const md = new vscode.MarkdownString(
          `Click [here](${encodeURI(`${COMMAND}?${JSON.stringify(args)}`)})  to run ${runText}`
        );
        md.isTrusted = true;
        return new vscode.Hover(['ForceCode: Run test', md]);
      }
    }

    return Promise.resolve(undefined);
  }
}
