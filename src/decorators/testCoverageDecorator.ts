import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import { FCFile } from '../services/codeCovView';
import { codeCovViewService, notifications } from '../services';

// create a decorator type that we use to decorate small numbers
const uncoveredLineStyle: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType(
  {
    backgroundColor: 'rgba(247,98,34,0.3)',
    // borderWidth: '1px',
    // borderStyle: 'dashed',
    overviewRulerColor: 'rgba(247,98,34,1)',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    isWholeLine: true,
    light: {
      // this color will be used in light color themes
      borderColor: 'rgba(247,98,34,1)',
    },
    dark: {
      // this color will be used in dark color themes
      borderColor: 'rgba(247,98,34,1)',
    },
  }
);

const acovLineStyle: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType(
  { backgroundColor: 'rgba(72,54,36,1)', isWholeLine: true }
);

// When this subscription is created (when the extension/Code boots), try to decorate the document
let activeEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
if (activeEditor) {
  updateDecorations();
}
// Export Function used when the Editor changes
export function editorUpdateApexCoverageDecorator(editor: vscode.TextEditor | undefined) {
  activeEditor = editor;
  if (editor) {
    updateDecorations();
  }
}

export function updateDecorations() {
  if (!activeEditor) {
    return;
  }
  var uncoveredLineOptions: vscode.DecorationOptions[] = [];
  var lineOpts: vscode.TextEditorDecorationType = uncoveredLineStyle;
  if (activeEditor.document.languageId != 'apexCodeCoverage') {
    if (
      vscode.window.forceCode &&
      vscode.window.forceCode.config &&
      vscode.window.forceCode.config.showTestCoverage &&
      activeEditor
    ) {
      uncoveredLineOptions = getUncoveredLineOptions(activeEditor.document);
    }
  } else {
    lineOpts = acovLineStyle;
    for (var i: number = 2; i < activeEditor.document.lineCount; i += 2) {
      let decorationRange: vscode.DecorationOptions = {
        range: activeEditor.document.lineAt(i).range,
      };
      uncoveredLineOptions.push(decorationRange);
    }
  }
  activeEditor.setDecorations(lineOpts, uncoveredLineOptions);
}

export function getUncoveredLineOptions(document: vscode.TextDocument) {
  var uncoveredLineDec: vscode.DecorationOptions[] = [];
  const fcfile: FCFile | undefined = codeCovViewService.findByPath(document.fileName);
  if (fcfile) {
    const wsMem: forceCode.IWorkspaceMember = fcfile.getWsMember();

    if (wsMem.coverage) {
      uncoveredLineDec = getUncoveredLineOptionsFor(wsMem);
    }
  }
  return uncoveredLineDec;

  function getUncoveredLineOptionsFor(workspaceMember: forceCode.IWorkspaceMember) {
    var uncoveredLineDecorations: vscode.DecorationOptions[] = [];
    let fileCoverage: forceCode.ICodeCoverage | undefined = workspaceMember.coverage;
    if (fileCoverage) {
      fileCoverage.Coverage.uncoveredLines.forEach(notCovered => {
        let decorationRange: vscode.DecorationOptions = {
          range: document.lineAt(Number(notCovered - 1)).range,
          hoverMessage: 'Line ' + notCovered + ' not covered by a test',
        };
        uncoveredLineDecorations.push(decorationRange);
        // Add output to output channel
      });
      var total: number = fileCoverage.NumLinesCovered + fileCoverage.NumLinesUncovered;
      var percent = ((fileCoverage.NumLinesCovered / total) * 100).toFixed(2) + '% covered';
      notifications.showStatus(fileCoverage.ApexClassOrTrigger.Name + ' ' + percent);
    }
    return uncoveredLineDecorations;
  }
}
