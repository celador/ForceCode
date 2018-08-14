import * as vscode from 'vscode';
import { getFileName } from '../parsers';

const COMMAND: string = 'command:ForceCode.runTests';

export class ApexTestLinkProvider implements vscode.DocumentLinkProvider {
    /*public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        const wordPosition = document.getWordRangeAtPosition(position);
        if (!wordPosition) return new Promise((resolve) => resolve());
        const word = document.getText(wordPosition);
        console.log(word);
        if(word.toLowerCase() === 'istest') {
            var fileName = getFileName(document);
            var args = { name: fileName, type: 'class' }
            return new vscode.Hover(['Run test', new vscode.MarkdownString('[Click to run](' + encodeURI(`${COMMAND}?` + JSON.stringify(args)) + ')')]);
        }
*/
    public provideDocumentLinks(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink[]> {
        var links: vscode.DocumentLink[] = [];
        //var locations: vscode.Location[] = [];
    
        if(document.fileName.endsWith('.cls')) {
            var fileContents: string = document.getText().toLowerCase();
            var fileLength: number = fileContents.length;
            var fileName = getFileName(document);
            if(fileContents.includes('@istest')) {
                var curIndex: number = -1;
                var curIndex2: number = -1;
                do {
                    curIndex++;
                    curIndex2++;
                    curIndex = fileContents.indexOf('@istest', curIndex);
                    curIndex2 = fileContents.indexOf('testmethod', curIndex2);
                    if(curIndex >= 0 || curIndex2 >= 0) {
                        var theIndex: number;
                        var addLength: number;
                        if(curIndex >= 0) {
                            addLength = '@istest'.length;
                            curIndex2 = -1;
                            theIndex = curIndex;
                        } else {
                            curIndex = fileLength - 2;  // so we don't search again
                            addLength = 'testmethod'.length;
                            theIndex = curIndex2;
                        }
                        var startpos: vscode.Position = document.positionAt(theIndex);
                        var endpos: vscode.Position = document.positionAt(theIndex + addLength);
                        var args = { name: fileName, type: 'class' }
                        if(links.length > 0) {
                            // attempt to get the method name
                            var endMethodNameIdx = fileContents.indexOf('(', theIndex);
                            // check just in case
                            if(endMethodNameIdx >= 0) {
                                var methodParts = fileContents.substring(theIndex, endMethodNameIdx).split(' ');
                                var methodName = methodParts[methodParts.length - 1];

                                if(!vscode.window.forceCode.dxCommands.isEmptyUndOrNull(methodName)) {
                                    args.name += '.' + methodName;
                                    args.type = 'method';
                                }
                            }
                        }
                        var uri: string = `${COMMAND}?` + JSON.stringify(args);

                        var docLink: vscode.DocumentLink = new vscode.DocumentLink(new vscode.Range(startpos, endpos), 
                            vscode.Uri.parse(uri));
                        //var location: vscode.Location = new vscode.Location(document.uri, new vscode.Range(startpos, endpos));
                        links.push(docLink);
                    }
                } while(curIndex >= 0 || curIndex2 >= 0);
            }
        }  
        return links;
    }
}