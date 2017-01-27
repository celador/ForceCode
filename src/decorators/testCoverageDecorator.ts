import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import * as parsers from './../parsers';

// create a decorator type that we use to decorate small numbers
const coverageChannel: vscode.OutputChannel = vscode.window.createOutputChannel('Apex Test Coverage');
const uncoveredLineStyle: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
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
    var uncoveredLineOptions: vscode.DecorationOptions[] = [];
    if (vscode.window.forceCode && vscode.window.forceCode.config && vscode.window.forceCode.config.showTestCoverage) {
        uncoveredLineOptions = getUncoveredLineOptions(activeEditor.document)
    }
    activeEditor.setDecorations(uncoveredLineStyle, uncoveredLineOptions);
    // activeEditor.setDecorations(coveredDecorationType, coveredLines);
}

export function getUncoveredLineOptions(document: vscode.TextDocument) {
    return Object.keys(vscode.window.forceCode.codeCoverage).reduce((opts, id) => {
        return opts.concat(getUncoveredLineOptionsFor(id));
    }, []);
    function getUncoveredLineOptionsFor(id) {
        var uncoveredLineDecorations: vscode.DecorationOptions[] = [];
        let fileCoverage: forceCode.ICodeCoverage = vscode.window.forceCode.codeCoverage[id];
        if (fileCoverage) {
            let namespaceMatch: boolean = (fileCoverage.namespace ? fileCoverage.namespace : '') === vscode.window.forceCode.config.prefix;
            let nameMatch: boolean = fileCoverage.name.toLowerCase() === parsers.getFileName(document).toLowerCase();
            let typeMatch: boolean = fileCoverage.type === parsers.getCoverageType(document);
            if (namespaceMatch && nameMatch && typeMatch) {
                fileCoverage.locationsNotCovered.forEach(notCovered => {
                    let lineNumber: number = notCovered.line.valueOf() - 1;
                    let decorationRange: vscode.DecorationOptions = { range: document.lineAt(Number(lineNumber)).range, hoverMessage: 'Line ' + lineNumber + ' not covered by a test' };
                    uncoveredLineDecorations.push(decorationRange);
                    // Add output to output channel
                    coverageChannel.appendLine(fileCoverage.name + ' line ' + notCovered.line + ' not covered.')
                });
                var covered: number = fileCoverage.numLocationsNotCovered.valueOf();
                var total: number = fileCoverage.numLocations.valueOf();
                vscode.window.forceCode.statusBarItem.text = fileCoverage.name + ' ' + (((total - covered) / total) * 100).toFixed(2) + '% covered';
            }
        }
        return uncoveredLineDecorations;
    }
}