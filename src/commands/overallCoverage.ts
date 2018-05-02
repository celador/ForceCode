import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import * as path from 'path';

export default function getOverallCoverage() {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Retrieving overall code coverage';
    var query = 'SELECT ApexClassOrTrigger.Name, NumLinesCovered, NumLinesUncovered '
    + 'FROM ApexCodeCoverageAggregate '
    + 'WHERE (NumLinesCovered > 0 OR NumLinesUncovered > 0) '
    + 'ORDER BY ApexClassOrTrigger.Name ASC';

    return vscode.window.forceCode.conn.tooling.query(query)
        .then(res => {
            if (res.records) {
                var outputString: string = 'Class/Trigger Name';
                // use this for formatting
                var spaces: string = '                                                  ';
                outputString += spaces.substr(0, spaces.length - outputString.length - 1) + 'Percent\t\t\tCovered/Total\n\n';
                res.records.forEach(function(curRes: forceCode.ICodeCoverage) {
                    var uncovered: number = curRes.NumLinesUncovered;
                    var total: number = curRes.NumLinesCovered + curRes.NumLinesUncovered;
                    var percent = (((total - uncovered) / total) * 100).toFixed(2) + '% covered';
                    outputString += curRes.ApexClassOrTrigger.Name + spaces.substr(0, spaces.length - curRes.ApexClassOrTrigger.Name.length - 1) + percent + '\t\t\t' + uncovered + '/' + total + '\n';
                });
                var filename = 'ApexCoverage' + Date.now() + '.txt';
                var wholeFilename = `${vscode.window.forceCode.workspaceRoot}${path.sep}coverage${path.sep}${filename}`;
                return vscode.window.forceCode.dxCommands.saveToFile(outputString, 'coverage' + path.sep + filename).then(ret =>{
                    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Code coverage retrieval complete!';
                    vscode.window.forceCode.resetMenu();
                    return vscode.workspace.openTextDocument(wholeFilename).then(doc => vscode.window.showTextDocument(doc, 3));
                });
            }
        });
}