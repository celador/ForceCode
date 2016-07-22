import * as vscode from 'vscode';
import {IForceService} from './../forceCode';

export default function exportPackage(context) {
    'use strict';
    // const jmt = require('jsforce-metadata-tools');
    return vscode.window.forceCode.connect(context)
        .then(svc => getAllFiles(svc))
        .then(finished, onError);
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
    function onError(err): boolean {
        vscode.window.setStatusBarMessage('ForceCode: Export Error');
        var outputChannel: vscode.OutputChannel = vscode.window.forceCode.outputChannel;
        outputChannel.appendLine('================================================================');
        outputChannel.appendLine(err);
        console.error(err);
        return false;
    }
    // =======================================================================================================================================
}
