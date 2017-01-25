import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import * as parsers from './../parsers';

// create a decorator type that we use to decorate small numbers
const uncoveredDecorationType: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(247,98,34,0.3)',
    // borderWidth: '1px',
    // borderStyle: 'dashed',
    overviewRulerColor: 'rgba(247,98,34,1)',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    isWholeLine: true,
    light: {
        // this color will be used in light color themes
        borderColor: 'rgba(247,98,34,1)'
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: 'rgba(247,98,34,1)'
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

export function updateDecorations() {
    if (!activeEditor) {
        return;
    }
    const uncoveredLines: vscode.DecorationOptions[] = [];
    if (vscode.window.forceCode.config.showTestCoverage) {
        Object.keys(vscode.window.forceCode.codeCoverage).forEach(id => {
            let coverage: forceCode.ICodeCoverage = vscode.window.forceCode.codeCoverage[id];
            if (coverage.namespace === vscode.window.forceCode.config.prefix) {
                if (coverage.name.toLowerCase() === parsers.getFileName(activeEditor.document).toLowerCase()) {
                    if (coverage.type === parsers.getCoverageType(activeEditor.document)) {
                        coverage.locationsNotCovered.forEach(notCovered => {
                            let lineNumber: number = notCovered.line.valueOf() - 1;
                            let decorationRange: vscode.DecorationOptions = { range: activeEditor.document.lineAt(Number(lineNumber)).range, hoverMessage: 'Line ' + lineNumber + ' not covered by a test' };
                            uncoveredLines.push(decorationRange);
                        });
                        var covered: number = coverage.numLocationsNotCovered.valueOf();
                        var total: number = coverage.numLocations.valueOf();
                        vscode.window.forceCode.statusBarItem.text = coverage.name + ' ' + (((total - covered) / total) * 100).toFixed(2) + '% covered';
                    }
                }
            }
        });
    }
    activeEditor.setDecorations(uncoveredDecorationType, uncoveredLines);
    // activeEditor.setDecorations(coveredDecorationType, coveredLines);
}
