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
    if (vscode.window.forceCode && vscode.window.forceCode.config && vscode.window.forceCode.config.showTestCoverage && activeEditor) {
        uncoveredLineOptions = getUncoveredLineOptions(activeEditor.document);
    }
    activeEditor.setDecorations(uncoveredLineStyle, uncoveredLineOptions);
    // activeEditor.setDecorations(coveredDecorationType, coveredLines);
}

export function getUncoveredLineOptions(document: vscode.TextDocument) {
    var uncoveredLineDec: vscode.DecorationOptions[] = [];

    if(vscode.window.forceCode.workspaceMembers) {
        coverageChannel.clear();
        // get the id
        var file = parsers.getWholeFileName(document);
        // get the id
        var curFileId: string;
        vscode.window.forceCode.workspaceMembers.some(cur => {
            if(cur.memberInfo.fileName.split('/')[1] === file) {
                curFileId = cur.memberInfo.id;
                return true;
            }
        });
        if(curFileId && vscode.window.forceCode.codeCoverage[curFileId]) {
            uncoveredLineDec = getUncoveredLineOptionsFor(curFileId);
        }
    }
    return uncoveredLineDec;

    function getUncoveredLineOptionsFor(id) {
        var uncoveredLineDecorations: vscode.DecorationOptions[] = [];
        let fileCoverage: forceCode.ICodeCoverage = vscode.window.forceCode.codeCoverage[id];
        if (fileCoverage) {
            fileCoverage.Coverage.uncoveredLines.forEach(notCovered => {
                let decorationRange: vscode.DecorationOptions = { range: document.lineAt(Number(notCovered - 1)).range, hoverMessage: 'Line ' + notCovered + ' not covered by a test' };
                uncoveredLineDecorations.push(decorationRange);
                // Add output to output channel
                coverageChannel.appendLine(fileCoverage.ApexClassOrTrigger.Name + ' line ' + notCovered + ' not covered.')
            });
            var uncovered: number = fileCoverage.NumLinesUncovered;
            var total: number = fileCoverage.NumLinesCovered + fileCoverage.NumLinesUncovered;
            var percent = (((total - uncovered) / total) * 100).toFixed(2) + '% covered';
            vscode.window.forceCode.statusBarItem.text = fileCoverage.ApexClassOrTrigger.Name + ' ' + percent;
            coverageChannel.appendLine(fileCoverage.ApexClassOrTrigger.Name + '=> Uncovered lines: ' + uncovered + ', Total Line: ' + total + ', ' + percent);
            vscode.window.forceCode.resetMenu();
        }
        return uncoveredLineDecorations;
    }
}