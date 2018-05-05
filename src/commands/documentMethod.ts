import * as vscode from 'vscode';

export default function documentMethod(context: vscode.ExtensionContext) {
    let snippetString: string = `\
/**
 * $0
 * 
 * @param   \${1:{null}}
 * @returns \${2:{null}}
 **/`;

    let snippet: vscode.SnippetString = new vscode.SnippetString(snippetString);

    vscode.window.activeTextEditor.insertSnippet(snippet);
    return;
}
