import * as vscode from 'vscode';
import jsforce = require('jsforce');

declare module 'vscode' {
    export namespace window {
        export let forceCode: IForceService;
    }
}

export interface Config {
    apiVersion?: string;
    password?: string;
    username?: string;
    url?: string;
    autoCompile?: boolean;
    poll?: number;
    pollTimeout?: number;
    debugOnly?: boolean;
    prefix?: string;
    deployOptions?: {
        verbose?: boolean,
        checkOnly?: boolean
    };
}

export interface IForceService {
    operatingSystem?: string;
    pathSeparator?: string;
    config?: Config;
    containerId?: string;
    containerAsyncRequestId?: string;
    conn?: jsforce.Connection;
    userInfo?: jsforce.UserInfo;
    username?: string;
    outputChannel: vscode.OutputChannel;
    connect(context: vscode.ExtensionContext): Promise<IForceService>;
    newContainer(): Promise<IForceService>;
    clearLog(): void;
    getConfig(): Config;
}

export interface ForceCodeError {
    message: string;
}
