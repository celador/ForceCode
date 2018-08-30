import * as vscode from 'vscode';
import * as path from 'path';

var archiver = require('archiver');

export default function deploy(context: vscode.ExtensionContext) {
    vscode.window.forceCode.outputChannel.clear();
    const deployPath: string = vscode.window.forceCode.workspaceRoot;

    var deployOptions: any = {
        checkOnly: true,
        ignoreWarnings: false,
        rollbackOnError: true,
        singlePackage: true,
    };

    return Promise.resolve(vscode.window.forceCode)
        .then(deployPackage)
        .then(finished)
        .catch(onError);
    // =======================================================================================================================================
    // =======================================================================================================================================
    function deployPackage() {
        // Proxy Console.info to capture the status output from metadata tools
        Object.assign(deployOptions, vscode.window.forceCode.config.deployOptions);
        vscode.window.forceCode.outputChannel.show();
        var archive = archiver('zip');
        archive.directory(deployPath + path.sep, false);
        archive.finalize();
        return vscode.window.forceCode.conn.metadata.deploy(archive, deployOptions)
            .complete(function(err, result) {
                if (err) { 
                    return err; 
                } else {
                    return result;
                }
        });
    }
    // =======================================================================================================================================
    function finished(res) /*Promise<any>*/ {
        if (res.status !== 'Failed') {
            vscode.window.forceCode.showStatus('ForceCode: Deployed $(thumbsup)');
        } else {
            vscode.window.showErrorMessage('ForceCode: Deploy Errors');
        }
        vscode.window.forceCode.outputChannel.append(vscode.window.forceCode.dxCommands.outputToString(res).replace(/{/g, '').replace(/}/g, ''));
        return res;
    }
    function onError(err) {
        return vscode.window.showErrorMessage('ForceCode: Deploy Errors\n' + err.message);
    }
    // =======================================================================================================================================
}



