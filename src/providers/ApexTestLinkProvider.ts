import * as vscode from 'vscode';
import { getFileName } from '../parsers';

const PROVIDER: string = 'command:';

export class ApexTestLinkProvider implements vscode.DocumentLinkProvider {
    //provideReferences(document: vscode.TextDocument, position: vscode.Position, context: vscode.ReferenceContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Location[]> {
        //throw new Error("Method not implemented.");
    //}

    public provideDocumentLinks(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink[]> {
        var links: vscode.DocumentLink[] = [];
        var name: string = getFileName(document);
        //var locations: vscode.Location[] = [];
    
        if(document.fileName.endsWith('.cls')) {
            var fileContents: string = document.getText().toLowerCase();
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
                            addLength = 'testmethod'.length;
                            theIndex = curIndex2;
                        }
                        var startpos: vscode.Position = document.positionAt(theIndex);
                        var endpos: vscode.Position = document.positionAt(theIndex + addLength);
                        var uri: string;
                        if(links.length === 0) {
                            uri = `${PROVIDER}ForceCode.runAllTests?` + JSON.stringify(document.uri);
                        } else {
                            // need to figure out a way to get the method names here. call runTestMethod with filename,methodname
                            uri = `${PROVIDER}ForceCode.runAllTests?`  + JSON.stringify(document.uri);
                        }
                        console.log(uri);

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