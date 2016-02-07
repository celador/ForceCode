import * as vscode from 'vscode';

export interface IService {
    userId?: string;
    connection?: {};
    queryString?: string;
};
const service: IService = {};

function getLogs(connection: any) {
    'use strict';
    service.queryString = `SELECT Id FROM ApexLog WHERE Request = 'API' AND Location = 'SystemLog'`
        + ` AND Operation like '%executeAnonymous%'`
        + ` AND LogUserId='${service.userId}' ORDER BY StartTime DESC, Id DESC LIMIT 1`;
    
    vscode.window.showQuickPick(['option 1', 'option 2', 'option 3'])
        .then(val => vscode.window.showInformationMessage('You picked ' + val));
    
    service.connection.query(service.queryString)
        .then((queryResult: any) => queryResult.records[0].Id);


}

export default getLogs;

