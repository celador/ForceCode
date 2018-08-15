import * as vscode from 'vscode';
import { getFileName, getFileExtension } from '../parsers';

const COMMAND: string = 'command:ForceCode.runTests';

export class ApexTestLinkProvider implements vscode.HoverProvider {
    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        var wordPosition = document.getWordRangeAtPosition(position);
        if (!wordPosition || wordPosition.start.character === 0) return new Promise((resolve) => resolve());
        wordPosition = wordPosition.with(wordPosition.start.with(wordPosition.start.line, wordPosition.start.character - 1));
        const word = document.getText(wordPosition).trim();
        if(word.toLowerCase() === '@istest' || word.toLowerCase() === 'testmethod') {
            var fileContents = document.getText();
            var fileName = getFileName(document);
            var args = { name: fileName, type: 'class' }
            var runText: string = 'all tests in ' + fileName + '.' + getFileExtension(document);
            
            // figure out if this is a class. if not, get the method name
            if(document.positionAt(fileContents.toLowerCase().indexOf('class')).isBefore(position)) {
                // get the method name
                var wordIndex: number = document.offsetAt(position);
                var endMethodNameIdx: number = fileContents.indexOf('(', wordIndex);

                if(endMethodNameIdx >= 0) {
                    var methodParts = fileContents.substring(wordIndex, endMethodNameIdx).split(' ');
                    var methodName = methodParts[methodParts.length - 1];

                    if(!vscode.window.forceCode.dxCommands.isEmptyUndOrNull(methodName)) {
                        args.name += '.' + methodName;
                        args.type = 'method';
                        runText = methodName + ' test method';
                    }
                }
            }

            var md: vscode.MarkdownString = new vscode.MarkdownString('Click [here](' + encodeURI(`${COMMAND}?` + JSON.stringify(args)) + ')  to run ' + runText);
            md.isTrusted = true;
            return new vscode.Hover(['ForceCode: Run test', md]);
        }
        return new Promise((resolve) => resolve());
    }
}