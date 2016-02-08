import * as vscode from 'vscode';
import {IForceService} from './../services';

export default function exportAll(force: IForceService) {
    'use strict';
    return force.connect()
        .then(finished, onError);
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function finished(res): boolean {
         
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
