import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import * as path from 'path';
import { dxService } from '../services';
import { apexTestResults } from '.';

export default function getOverallCoverage() {
  return apexTestResults().then(res => {
    if (res.records) {
      var outputString: string = 'Class/Trigger Name';
      // use this for formatting
      var spaces: string = '                                                       ';
      var orgTotalLines: number = 0;
      var orgTotalCoveredLines: number = 0;
      outputString +=
        spaces.substr(0, spaces.length - outputString.length - 1) +
        'Percent\t\t\tCovered/Total\n\n';
      res.records.forEach(function(curRes: forceCode.ICodeCoverage) {
        var total: number = curRes.NumLinesCovered + curRes.NumLinesUncovered;
        var percent = ((curRes.NumLinesCovered / total) * 100).toFixed(2) + '% covered';
        outputString +=
          curRes.ApexClassOrTrigger.Name +
          spaces.substr(0, spaces.length - curRes.ApexClassOrTrigger.Name.length - 1) +
          percent +
          spaces.substr(0, 20 - percent.length) +
          curRes.NumLinesCovered +
          '/' +
          total +
          '\n';
        orgTotalCoveredLines += curRes.NumLinesCovered;
        orgTotalLines += total;
      });
      var orgPercent = ((orgTotalCoveredLines / orgTotalLines) * 100).toFixed(2) + '% covered';
      outputString +=
        '\nOverall coverage: ' +
        spaces.substr(0, spaces.length - 'Overall coverage: '.length - 1) +
        orgPercent +
        spaces.substr(0, 20 - orgPercent.length) +
        orgTotalCoveredLines +
        '/' +
        orgTotalLines;
      return dxService
        .saveToFile(outputString, 'coverage' + path.sep + 'ApexCoverage-' + Date.now() + '.acov')
        .then(filename => {
          vscode.window.forceCode.showStatus('ForceCode: Code coverage retrieval complete!');
          return vscode.workspace
            .openTextDocument(filename)
            .then(doc => vscode.window.showTextDocument(doc, 3));
        });
    }
    return undefined;
  });
}
