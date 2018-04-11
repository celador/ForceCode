import * as vscode from 'vscode';
import * as error from './../util/error';
import * as dx from './dx';
import * as ccr from '../dx/generator';
import {SObjectCategory} from '../dx/describe';

export default async function codeCompletionRefresh(context: vscode.ExtensionContext): Promise<any> {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Refreshing Objects from Org, this could take a VERY LONG TIME!!!';
    vscode.window.forceCode.outputChannel.clear();
    vscode.window.forceCode.outputChannel.show();
    var gen = new ccr.FauxClassGenerator();
    try {
        await gen.generate(vscode.workspace.rootPath, SObjectCategory.ALL)
        vscode.window.forceCode.statusBarItem.text = 'ForceCode: Retrieval of objects complete!!!';
        vscode.window.forceCode.resetMenu();
        return Promise.resolve();
    } catch(e) {
        return Promise.reject(error.outputError(e, vscode.window.forceCode.outputChannel));
    }
    // =======================================================================================================================================
}
