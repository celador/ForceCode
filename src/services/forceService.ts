import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import jsforce = require('jsforce');
const service: forceCode.IForceService = vscode.window.forceCode;

export default class ForceService implements forceCode.IForceService {

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

    public connect(): Promise<forceCode.IForceService> {
        'use strict';
        // Lazy-load the connection
        if (service === undefined || service.conn === undefined || service.config === undefined) {
            // this.conn = new jsforce.Connection();
            service.conn = new jsforce.Connection();
            /// TODO: Pull credentials from .config jsforce.config.js file from the user directory
            service.config = vscode.workspace.getConfiguration('sfdc');
            const username: string = service.config.username || '';
            const password: string = (service.config.password || '') + (service.config.token || '');
            return service.conn.login(username, password).then((userInfo) => {
                service.userInfo = userInfo;
                return service;
            });
        } else {
            return new Promise((resolve, reject) => {
                resolve(service);
            });
        }
    }
}
