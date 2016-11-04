import * as vscode from 'vscode';
import {IForceService} from './../forceCode';
import * as error from './../util/error';


export default function exportPackage(context) {
    return vscode.window.forceCode.connect(context)
        .then(svc => getAllFiles(svc))
        .then(finished)
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));

    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function getAllFiles(svc: IForceService) {
        return svc.conn
            .metadata.retrieve({ packageNames: [ 'Test' ] });
            //  .stream()
            //  .pipe(fs.createWriteStream(vscode.workspace.rootPath + '/MyPackage.zip'));

    }
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function finished(res): boolean {
        console.log(res);
        return true;
    }
    // =======================================================================================================================================
    // function onError(err): boolean {
    //     vscode.window.setStatusBarMessage('ForceCode: Export Error');
    //     var outputChannel: vscode.OutputChannel = vscode.window.forceCode.outputChannel;
    //     outputChannel.appendLine('================================================================');
    //     outputChannel.appendLine(err);
    //     console.error(err);
    //     return false;
    // }
    // =======================================================================================================================================
}
