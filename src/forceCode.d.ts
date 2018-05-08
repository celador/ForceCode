import * as vscode from 'vscode';
import jsforce = require('jsforce');
import { DXCommands} from './services/dxService';

declare module 'vscode' {
    export namespace window {
        export let forceCode: IForceService;
    }
}

export interface IMetadataFileProperties {
    createdById: string;
    createdByName: string;
    createdDate: string;
    fileName: string;
    fullName: string;
    id: string;
    lastModifiedById: string;
    lastModifiedByName: string;
    lastModifiedDate: string;
    manageableState: string;
    namespacePrefix: string;
    type: string;
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
    poll?: number;
    pollTimeout?: number;
    prefix?: string;
    proxyUrl?: string;
    showFilesOnOpen?: boolean;
    showFilesOnOpenMax?: number;
    showTestCoverage? : boolean;
    showTestLog? : boolean;
    spaDist? : string;
    src?: string;
    url?: string;
    username?: string;
    // workspaceRoot?: string;
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
    memberInfo: IMetadataFileProperties;
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

interface IMetadataObject {
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
    dxCommands: DXCommands;
    operatingSystem?: string;
    config?: Config;
    workspaceRoot: string;
    completions?: vscode.CompletionItem[];
    describe: IMetadataDescribe;
    apexMetadata: IMetadataFileProperties[];
    declarations?: IDeclarations;
    codeCoverage?: {};
    codeCoverageWarnings?: ICodeCoverageWarning[];
    // symbolTable?: any;
    containerId?: string;
    statusInterval: any;    
    workspaceMembers: {};//IWorkspaceMember[];
    containerMembers: IContainerMember[];
    containerAsyncRequestId?: string;
    conn?: jsforce.Connection;
    username?: string;
    outputChannel: vscode.OutputChannel;
    statusBarItem_UserInfo: vscode.StatusBarItem;
    statusBarItem: vscode.StatusBarItem;
    connect(context: vscode.ExtensionContext): Promise<IForceService>;
    newContainer(force: Boolean): Promise<IForceService>;
    showStatus(message: string): void;
    clearLog(): void;
    refreshApexMetadata(): Promise<any>;
    showStatus(message: string): void;
    resetStatus(): void;
    getWorkspaceMembers(metadata?): any;//Promise<IWorkspaceMember[]>;
    checkAndSetWorkspaceMembers(newMembers, check?: boolean): Promise<any>;
    cleanupContainers(): Promise<any>;
}


export interface ForceCodeError {
    message: string;
}
