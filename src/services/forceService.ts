import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
var service: forceCode.IForceService;
const jsforce = require('jsforce');

export default class ForceService implements forceCode.IForceService {
    public connect(): Promise<forceCode.IForceService> {
        'use strict';
        if (service === undefined) {
            service = vscode.window.forceCode || new ForceService();
        }
        // Lazy-load the connection
        if (service.userInfo === undefined)  {
            vscode.window.forceCode.conn = new jsforce.Connection();
            const username: string = service.config.username || '';
            const password: string = (service.config.password || '') + (service.config.token || '');
            vscode.window.setStatusBarMessage(`ForceCode: Connecting $(plug)`);
            return service.conn.login(username, password).then((userInfo) => {
                vscode.window.setStatusBarMessage(`ForceCode: Connected $(zap)`);
                service.userInfo = userInfo;
                return service;
            });
        } else {
            vscode.window.setStatusBarMessage(`ForceCode: Connected $(history)`);
            return new Promise((resolve, reject) => {
                resolve(service);
            });
        }
    }

    public clearLog() {
        service.outputChannel.clear();
    };

    public newContainer(): PromiseLike<forceCode.IForceService> {
        'use strict';
        return service.conn.tooling.sobject('MetadataContainer')
            .create({ name: 'ForceCode-' + Date.now() })
            .then(res => {
                service.containerId = res.id;
                return service;
            });
    }

}
