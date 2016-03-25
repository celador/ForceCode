import * as vscode from 'vscode';
import {IForceService} from './../forceCode';
import fs = require('fs-extra');

export default function exportPackage(force: IForceService) {
    'use strict';
    // const jmt = require('jsforce-metadata-tools');
    return force.connect()
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
        vscode.window.setStatusBarMessage('open Error');
        var outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('ForceCode');
        outputChannel.append('================================================================');
        outputChannel.append(err);
        console.log(err);
        return false;
    }
    // =======================================================================================================================================
}
