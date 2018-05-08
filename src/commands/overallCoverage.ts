import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import * as path from 'path';

export default function getOverallCoverage() {
    var query = 'SELECT ApexClassOrTrigger.Name, NumLinesCovered, NumLinesUncovered '
    + 'FROM ApexCodeCoverageAggregate '
    + 'WHERE (NumLinesCovered > 0 OR NumLinesUncovered > 0) '
    + 'ORDER BY ApexClassOrTrigger.Name ASC';

    return vscode.window.forceCode.conn.tooling.query(query)
        .then(res => {
            if (res.records) {
                var outputString: string = 'Class/Trigger Name';
                // use this for formatting
                var spaces: string = '                                                       ';
                outputString += spaces.substr(0, spaces.length - outputString.length - 1) + 'Percent\t\t\tCovered/Total\n\n';
                res.records.forEach(function(curRes: forceCode.ICodeCoverage) {
                    var uncovered: number = curRes.NumLinesUncovered;
                    var total: number = curRes.NumLinesCovered + curRes.NumLinesUncovered;
                    var percent = (((total - uncovered) / total) * 100).toFixed(2) + '% covered';
                    outputString += curRes.ApexClassOrTrigger.Name + spaces.substr(0, spaces.length - curRes.ApexClassOrTrigger.Name.length - 1) + percent + spaces.substr(0, 20 - percent.length) + curRes.NumLinesCovered + '/' + total + '\n';
                });
                return vscode.window.forceCode.dxCommands.saveToFile(outputString, 'coverage' + path.sep + 'ApexCoverage-' + Date.now() + '.acov').then(filename =>{
                    vscode.window.forceCode.showStatus('ForceCode: Code coverage retrieval complete!');
                    return vscode.workspace.openTextDocument(filename).then(doc => vscode.window.showTextDocument(doc, 3));
                });
            }
        });
}