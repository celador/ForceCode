import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';
import * as error from './../util/error';
import * as dx from './dx';
import * as ccr from '../dx/generator';
import {SObjectCategory} from '../dx/describe';

export default function codeCompletionRefresh(context: vscode.ExtensionContext): Promise<any> {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Refreshing Objects from Org';
    var gen = new ccr.FauxClassGenerator();
    return gen.generate(vscode.workspace.rootPath, SObjectCategory.ALL);
    // =======================================================================================================================================
}
