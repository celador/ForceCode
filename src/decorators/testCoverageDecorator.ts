import * as vscode from 'vscode';
import * as forceCode from '../forceCode';
import { codeCovViewService, notifications, FCFile } from '../services';

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

export function updateDecorations() {
  vscode.window.visibleTextEditors.forEach(editor => {
    var uncoveredLineOptions: vscode.DecorationOptions[] = [];
    var lineOpts: vscode.TextEditorDecorationType = uncoveredLineStyle;
    if (editor.document.languageId === 'apexCodeCoverage') {
      lineOpts = acovLineStyle;
      for (var i: number = 2; i < editor.document.lineCount; i += 2) {
        let decorationRange: vscode.DecorationOptions = {
          range: editor.document.lineAt(i).range,
        };
        uncoveredLineOptions.push(decorationRange);
      }
    } else if (vscode.window.forceCode?.config?.showTestCoverage) {
      uncoveredLineOptions = getUncoveredLineOptions(editor);
    }
    editor.setDecorations(lineOpts, uncoveredLineOptions);
  });

  if (vscode.window.activeTextEditor) {
  }
}

function getUncoveredLineOptions(editor: vscode.TextEditor) {
  const document = editor.document;
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
    const wsMemCoverage = workspaceMember.selectedCoverage || 'overall';
    let fileCoverage: forceCode.ICodeCoverage | undefined = workspaceMember.coverage.get(
      wsMemCoverage
    );
    if (fileCoverage) {
      fileCoverage.Coverage.uncoveredLines.forEach(notCovered => {
        let decorationRange: vscode.DecorationOptions = {
          range: document.lineAt(Number(notCovered - 1)).range,
          hoverMessage: 'Line ' + notCovered + ' not covered by a test',
        };
        uncoveredLineDecorations.push(decorationRange);
        // Add output to output channel
      });

      if (editor === vscode.window.activeTextEditor) {
        var total: number = fileCoverage.NumLinesCovered + fileCoverage.NumLinesUncovered;
        var percent = ((fileCoverage.NumLinesCovered / total) * 100).toFixed(2) + '% covered';
        notifications.showStatus(fileCoverage.ApexClassOrTrigger.Name + ' ' + percent);
      }
    }
    return uncoveredLineDecorations;
  }
}
