import * as vscode from 'vscode';
import { Connection } from 'jsforce';

declare module 'vscode' {
    export namespace window {
        export let forceCode: IForceService;
    }
}

export interface FCWorkspaceMembers {
    [key: string]: IWorkspaceMember;
}

export interface FCOrg {
    username: string;
    url: string;
    src?: string;
}

export interface Config {
    apiVersion?: string;
    autoCompile?: boolean;
    autoRefresh?: boolean;
    browser?: string;
    checkForFileChanges?: boolean;
    debugFilter?: string;
    debugOnly?: boolean;
    deployOptions?: {
        allowMissingFiles?: boolean,
        checkOnly?: boolean,
        ignoreWarnings?: boolean,
        rollbackOnError?: boolean,
        runTests?: string[],
        singlePackage?: boolean,
        testLevel?: string,       
    };
    maxFileChangeNotifications?: number;
    maxQueryHistory?: number;
    maxQueryResultsPerPage?: number;
    outputQueriesAsCSV?: boolean;
    overwritePackageXML?: boolean;
    poll?: number;
    pollTimeout?: number;
    prefix?: string;
    revealTestedClass?: boolean;
    showFilesOnOpen?: boolean;
    showFilesOnOpenMax?: number;
    showTestCoverage? : boolean;
    showTestLog? : boolean;
    spaDist? : string;
    staticResourceCacheControl?: string;
    src?: string;
    url?: string;
    username?: string;    
}

export interface MetadataResult {
    ApiVersion: number;
    attributes: { type: string };
    Body: string;
    BodyCrc: number;
    CreatedById: string;
    CreatedDate: string;
    FullName: string;
    Id: string;
    IsValid: boolean;
    LastModifiedById: string;
    LastModifiedDate: string;
    LastModifiedByName: string;
    LengthWithoutComments: number;
    ManageableState: string;
    Metadata: {};
    Name: string;
    NamespacePrefix: string;
    Status: string;
    SymbolTable: {};
    SystemModstamp: string;
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
    id: string;
    lastModifiedDate: string;
    lastModifiedByName: string;
    lastModifiedById: string;
    type: string;
    saveTime: boolean;
    coverage?: ICodeCoverage;
}

interface ICodeCoverage {
    attributes: 
		{
			type: string,
			url: string,
		},
		ApexClassOrTriggerId: string,
		ApexClassOrTrigger: 
		{
			attributes: 
			{
				type: string,
				url: string,
			},
			Name: string,
		},
		NumLinesCovered: number,
		NumLinesUncovered: number,
		Coverage: 
		{
            coveredLines: number[],
            uncoveredLines: number[]
        }
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

export interface IMetadataObject {
    directoryName: string;
    inFolder: boolean;
    metaFile: boolean;
    suffix: string;
    xmlName: string;
    childXmlNames?: string[];
}

export interface IMetadataDescribe {
    metadataObjects: IMetadataObject[];
    organizationNamespace: string;
    partialSaveAllowed: boolean;
    testRequired: boolean;
}

export interface IForceService {
    config?: Config;
    projectRoot: string;
    workspaceRoot: string;
    storageRoot: string;
    describe: IMetadataDescribe;
    declarations?: IDeclarations;
    containerId?: string;
    statusTimeout: any;    
    containerMembers: IContainerMember[];
    containerAsyncRequestId?: string;
    conn?: Connection;
    outputChannel: vscode.OutputChannel;
    statusBarItem: vscode.StatusBarItem;
    fcDiagnosticCollection: vscode.DiagnosticCollection;
    uuid: string;
    connect(): Promise<IForceService>;
    newContainer(force: Boolean): Promise<IForceService>;
    showStatus(message: string): void;
    clearLog(): void;
    resetStatus(): void;
    checkForFileChanges(): any;
}


export interface ForceCodeError {
    message: string;
}
