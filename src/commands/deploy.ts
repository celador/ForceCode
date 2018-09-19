import * as vscode from 'vscode';
import { dxService, codeCovViewService, fcConnection } from '../services';
import { getFileListFromPXML, zipFiles } from './../services';
import * as path from 'path';
import { FCFile } from '../services/codeCovView';
import { IWorkspaceMember } from '../forceCode';

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

    return getFileListFromPXML().then(files => {
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
            })
            .then(finished);


        // =======================================================================================================================================
        function finished(res) /*Promise<any>*/ {
            if (res.status !== 'Failed') {
                // update the wsMembers with the newer date
                files.forEach(file => {
                    const curFCFile: FCFile = codeCovViewService.findByPath(path.join(deployPath, file));
                    if(curFCFile) {
                        const wsMem: IWorkspaceMember = curFCFile.getWsMember();
                        wsMem.lastModifiedDate = (new Date()).toISOString();
                        wsMem.lastModifiedById = fcConnection.currentConnection.orgInfo.userId;
                        curFCFile.updateWsMember(wsMem);
                    }
                });
                vscode.window.forceCode.showStatus('ForceCode: Deployed $(thumbsup)');
            } else {
                vscode.window.showErrorMessage('ForceCode: Deploy Errors');
            }
            vscode.window.forceCode.outputChannel.append(dxService.outputToString(res).replace(/{/g, '').replace(/}/g, ''));
            return res;
        }
        // =======================================================================================================================================
    });
}