import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';
import * as error from './../util/error';


export default function documentMethod(context: vscode.ExtensionContext) {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Document Method';

    let snippetString: string = `\
/**
 * $0
 * 
 * @param   \${1:{null}}
 * @returns \${2:{null}}
 **/`;

    // let snippet: vscode.SnippetString = new vscode.SnippetString(snippetString);

    // vscode.window.activeTextEditor.insertSnippet(snippet);
    return;
}
