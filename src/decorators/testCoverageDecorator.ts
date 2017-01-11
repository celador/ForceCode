import * as vscode from 'vscode';
import * as path from 'path';

// create a decorator type that we use to decorate small numbers
const coveredDecorationType: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
    borderWidth: '1px',
    borderStyle: 'solid',
    overviewRulerColor: 'blue',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    light: {
        // this color will be used in light color themes
        borderColor: 'darkblue'
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: 'lightblue'
    }
});

// create a decorator type that we use to decorate large numbers
const uncoveredDecorationType: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
    cursor: 'crosshair',
    backgroundColor: 'rgba(255,0,0,0.3)'
});
// When this subscription is created (when the extension/Code boots), try to decorate the document
let timeout: any = undefined;
let activeEditor: vscode.TextEditor = vscode.window.activeTextEditor;
if (activeEditor) {
    triggerUpdateDecorations();
}
// Export Function used when the Editor changes
export function editorDecorator(editor) {
    activeEditor = editor;
    if (editor) {
        triggerUpdateDecorations();
    }
};
// Export Function used when the Document changes
export function documentDecorator(event) {
    if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations();
    }
};

function triggerUpdateDecorations() {
    // Wait half a second before updating the document
    if (timeout) {
        clearTimeout(timeout);
    }
    timeout = setTimeout(updateDecorations, 500);
}

function updateDecorations() {
    if (!activeEditor) {
        return;
    }
    const regEx: RegExp = /\d+/g;
    const text: string = activeEditor.document.getText();
    const smallNumbers: vscode.DecorationOptions[] = [];
    const largeNumbers: vscode.DecorationOptions[] = [];
    let match: RegExpExecArray = undefined;
    while (match = regEx.exec(text)) {
        const startPos: vscode.Position = activeEditor.document.positionAt(match.index);
        const endPos: vscode.Position = activeEditor.document.positionAt(match.index + match[0].length);
        const decorationRange: vscode.DecorationOptions = { range: new vscode.Range(startPos, endPos), hoverMessage: 'Number **' + match[0] + '**' };
        if (match[0].length < 3) {
            smallNumbers.push(decorationRange);
        } else {
            largeNumbers.push(decorationRange);
        }
    }
    // Apply Decoration to
    activeEditor.setDecorations(coveredDecorationType, smallNumbers);
    activeEditor.setDecorations(uncoveredDecorationType, largeNumbers);
}
