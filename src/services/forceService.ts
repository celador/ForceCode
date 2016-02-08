import * as vscode from 'vscode';
import jsforce = require('jsforce');

interface config {
    username?: string;
    password?: string;
    token?: string;
}

export interface IForceService {
    config?: config;
    containerId?: string;
    containerAsyncRequestId?: string;
    conn?: jsforce.Connection;
    userInfo?: jsforce.UserInfo;
    connect(): Promise<ForceService>;
    newContainer(): PromiseLike<ForceService>;
}
export class ForceService implements IForceService {
    public conn: jsforce.Connection = undefined;
    public containerId: string = undefined;
    public containerAsyncRequestId: string = undefined;
    public userInfo: jsforce.UserInfo = undefined;
    public config: config = undefined;

    public newContainer(): PromiseLike<ForceService> {
        'use strict';
        return this.conn.tooling.sobject('MetadataContainer')
            .create({ name: 'ForceCode-' + Date.now() })
            .then(res => {
                this.containerId = res.id;
                return this;
            });
    }

    public connect(): Promise<IForceService> {
        'use strict';
        // Lazy-load the connection
        if (this.conn === undefined) {
            var jsforce: any = require('jsforce');
            this.conn = new jsforce.Connection();
            /// TODO: Pull credentials from .config jsforce.config.js file from the user directory
            this.config = vscode.workspace.getConfiguration('sfdc');
            var username: string = this.config.username || '';
            var password: string = (this.config.password || '') + (this.config.token || '');
            return this.conn.login(username, password).then((userInfo) => {
                this.userInfo = userInfo;
                return this;
            });
        } else {
            return new Promise((resolve, reject) => {
                resolve(this);
            });
        }
    }
}
