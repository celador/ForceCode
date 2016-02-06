import * as vscode from 'vscode';

export interface IService {
    userId?: string;
    connection?: {};
};

const service: IService = {};

function getLogs() {
    'use strict';
    vscode.window.showQuickPick(['option 1', 'option 2', 'option 3'])
        .then(val => vscode.window.showInformationMessage('You picked ' + val));

}

export default getLogs;

