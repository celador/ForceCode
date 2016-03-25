import * as vscode from 'vscode';
import jsforce = require('jsforce');

declare module 'vscode' {
    export namespace window {
        export let forceCode: IForceService;
    }
}

export interface Config {
    username?: string;
    password?: string;
    token?: string;
}

export interface IForceService {
    outputChannel?: vscode.OutputChannel;
    config?: Config;
    containerId?: string;
    containerAsyncRequestId?: string;
    conn?: jsforce.Connection;
    userInfo?: jsforce.UserInfo;
    connect(): PromiseLike<IForceService>;
    newContainer(): PromiseLike<IForceService>;
    clearLog(): void;
}
