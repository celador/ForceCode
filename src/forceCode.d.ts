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
    showTestCoverage? : boolean;
    showTestLog? : boolean;
    spaDist? : string;
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

interface IWorkspaceMember {
    name: string;
    path: string;
    memberInfo: jsforce.IMetadataFileProperties;
}

export interface IWorkspaceService {
    getWorkspaceMembers: () => Promise<IWorkspaceMember[]>;
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

interface IContainerMember {
    name: string;
    id: string;
}

interface IMetadataObject {
    directoryName: string;
    inFolder: boolean;
    metaFile: boolean;
    suffix: string;
    xmlName: string;
    childXmlNames?: string[];
}

// interface IMetadataDescribe {
//     metadataObjects: IMetadataObject[];
//     organizationNamespace: string;
//     partialSaveAllowed: boolean;
//     testRequired: boolean;
// }

export interface IForceService {
    operatingSystem?: string;
    config?: Config;
    workspaceRoot: string;
    completions?: vscode.CompletionItem[];
    metadata: jsforce.IMetadataFileProperties[];
    declarations?: IDeclarations;
    codeCoverage?: {};
    codeCoverageWarnings?: ICodeCoverageWarning[];
    // symbolTable?: any;
    containerId?: string;
    queueCompile?: boolean;
    isCompiling?: boolean;
    workspaceMembers: IWorkspaceMember[];
    containerMembers: IContainerMember[];
    containerAsyncRequestId?: string;
    conn?: jsforce.Connection;
    userInfo?: jsforce.UserInfo;
    username?: string;
    outputChannel: vscode.OutputChannel;
    statusBarItem: vscode.StatusBarItem;
    connect(context: vscode.ExtensionContext): Promise<IForceService>;
    newContainer(force: Boolean): Promise<IForceService>;
    clearLog(): void;
    refreshApexMetadata(): Promise<any>;
}

export interface ForceCodeError {
    message: string;
}
