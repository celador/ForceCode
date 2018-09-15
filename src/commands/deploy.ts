import * as vscode from 'vscode';
import { dxService } from '../services';
import { getFileListFromPXML, zipFiles } from './../services';

export default function deploy(context: vscode.ExtensionContext) {
    vscode.window.forceCode.outputChannel.clear();
    const deployPath: string = vscode.window.forceCode.projectRoot;

    var deployOptions: any = {
        checkOnly: true,
        ignoreWarnings: false,
        rollbackOnError: true,
        singlePackage: true,
        allowMissingFiles: true,
    };

    return Promise.resolve(vscode.window.forceCode)
        .then(deployPackage)
        .then(finished);
    // =======================================================================================================================================
    // =======================================================================================================================================
    function deployPackage() {
        return getFileListFromPXML().then(files => {
            files.push('package.xml');
            var zip = zipFiles(files, deployPath);
            Object.assign(deployOptions, vscode.window.forceCode.config.deployOptions);
            vscode.window.forceCode.outputChannel.show();
            return vscode.window.forceCode.conn.metadata.deploy(zip, deployOptions)
                .complete(function (err, result) {
                    if (err) {
                        return err;
                    } else {
                        return result;
                    }
                });
        });
    }
    // =======================================================================================================================================
    function finished(res) /*Promise<any>*/ {
        if (res.status !== 'Failed') {
            vscode.window.forceCode.showStatus('ForceCode: Deployed $(thumbsup)');
        } else {
            vscode.window.showErrorMessage('ForceCode: Deploy Errors');
        }
        vscode.window.forceCode.outputChannel.append(dxService.outputToString(res).replace(/{/g, '').replace(/}/g, ''));
        return res;
    }
    // =======================================================================================================================================
}



