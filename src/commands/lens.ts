import * as vscode from 'vscode';
import * as fs   from 'fs';
import * as path from 'path';
// import {constants, IForceService} from './../services';
// const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('ForceCode');

/**
 * Provide the lookup so we can peek into the files.
 */
export default class PeekFileDefinitionProvider implements vscode.DefinitionProvider {
    // This is the provider definition.  It's the interface, and is provided by the editor.
    provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.Definition {
        let workingDir: string = path.dirname(document.fileName);
        let word: string = document.getText(document.getWordRangeAtPosition(position));
        let line: vscode.TextLine = document.lineAt(position);
        //  We are looking for strings with filenames
        //  - simple hack for now we look for the string with our current word in it on our line
        //    and where our cursor position is inside the string
        let reStr: string = `\"(.*?${word}.*?)\"|\'(.*?${word}.*?)\'`;
        // Here we're finally getting the text that matches the regex 
        let match: RegExpMatchArray = line.text.match(reStr);
        // If there was a match, we will br provided with a match index and an array of matches?
        if (match !== null) {
            let potentialFilename: string = match[1] || match[2] || 'foo.js';
            let matchStart: number = match.index;
            let matchEnd: number = match.index + potentialFilename.length;
            //  Verify the match string is at same location as cursor
            //      ...since the cursor must be between the start and end of the match
            if ((position.character >= matchStart) && (position.character <= matchEnd)) {
                // We then get the full path using the Node path object
                let fullPath: string = path.resolve(workingDir, potentialFilename);
                // Insure the file exists before we attempt to do something with it.
                // todo: make this method operate async
                if (fs.existsSync(fullPath)) {
                    // We then provide the CodeLens with the document and position in it that we want to look at.
                    return new vscode.Location(vscode.Uri.file(fullPath), new vscode.Position(0, 1));
                }
            }
        }
        // We have no match of something that looks like a string where the cursor position is.
        return null;
    }
}
