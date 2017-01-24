import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import * as parsers from './../parsers';

// create a decorator type that we use to decorate small numbers
const uncoveredDecorationType: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255,0,0,0.3)',
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
    },
});

// When this subscription is created (when the extension/Code boots), try to decorate the document
let timeout: any = undefined;
let activeEditor: vscode.TextEditor = vscode.window.activeTextEditor;
if (activeEditor) {
    triggerUpdateDecorations();
}
// Export Function used when the Editor changes
export function editorUpdateApexCoverageDecorator(editor) {
    activeEditor = editor;
    if (editor) {
        triggerUpdateDecorations();
    }
};
// Export Function used when the Document changes
export function documentUpdateApexCoverageDecorator(event) {
    if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations();
    }
};

export function triggerUpdateDecorations() {
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
    const uncoveredLines: vscode.DecorationOptions[] = [];

    Object.keys(vscode.window.forceCode.codeCoverage).forEach(id => {
        let coverage: forceCode.ICodeCoverage = vscode.window.forceCode.codeCoverage[id];
        if (coverage.namespace === vscode.window.forceCode.config.prefix) {
            if (coverage.name.toLowerCase() === parsers.getFileName(activeEditor.document).toLowerCase()) {
                if (coverage.type === parsers.getCoverageType(activeEditor.document)) {
                    coverage.locationsNotCovered.forEach(notCovered => {
                        let lineNumber: Number = notCovered.line.valueOf() + 1;
                        let decorationRange: vscode.DecorationOptions = { range: activeEditor.document.lineAt(Number(lineNumber)).range, hoverMessage: 'Line ' + lineNumber + ' not covered by a test' };
                        uncoveredLines.push(decorationRange);
                    });
                }
            }
        }
    });
    activeEditor.setDecorations(uncoveredDecorationType, uncoveredLines);
    // activeEditor.setDecorations(coveredDecorationType, coveredLines);
}
