import * as vscode from 'vscode';
import jsforce = require('jsforce');

declare module 'vscode' {
    export namespace window {
        export let forceCode: IForceService;
    }
}

export interface Config {
    apiVersion?: string;
    autoCompile?: boolean;
    autoRefresh?: boolean;
    browser?: string;
    debugOnly?: boolean;
    debugFilter?: string;
    deployOptions?: {
        verbose?: boolean,
        checkOnly?: boolean
    };
    password?: string;
    poll?: number;
    pollTimeout?: number;
    prefix?: string;
    proxyUrl?: string;
    showTestLog? : boolean;
    src?: string;
    url?: string;
    username?: string;
    // workspaceRoot?: string;
}

interface ILocationsNotCovered {
    column: Number;
    line: Number;
    numExecutions: Number;
    time: Number;
}

interface ICodeCoverage {
    dmlInfo: any[];
    id: string;
    locationsNotCovered: ILocationsNotCovered[];
    methodInfo: any[];
    name: string;
    namespace: string;
    numLocations: Number;
    numLocationsNotCovered: Number;
    soqlInfo: any[];
    soslInfo: any[];
    type: string;
}

interface ICodeCoverageWarning {
    id: string;
    message: string;
    name: string;
    namespace: string;
}

interface IDeclarations {
    public?: any[],
    private?: any[],
    managed?: any[]
}

export interface IForceService {
    operatingSystem?: string;
    config?: Config;
    completions?: vscode.CompletionItem[];
    declarations?: IDeclarations;
    codeCoverage?: {};
    codeCoverageWarnings?: ICodeCoverageWarning[];
    // symbolTable?: any;
    containerId?: string;
    queueCompile?: boolean;
    isCompiling?: boolean;
    containerMembers: { name: string, id: string }[];
    containerAsyncRequestId?: string;
    conn?: jsforce.Connection;
    userInfo?: jsforce.UserInfo;
    username?: string;
    outputChannel: vscode.OutputChannel;
    statusBarItem: vscode.StatusBarItem;
    connect(context: vscode.ExtensionContext): Promise<IForceService>;
    newContainer(force: Boolean): Promise<IForceService>;
    clearLog(): void;
}

export interface ForceCodeError {
    message: string;
}
