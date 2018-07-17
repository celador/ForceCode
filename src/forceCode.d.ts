import * as vscode from 'vscode';
import jsforce = require('jsforce');
import { DXCommands} from './services/dxService';
import { IMetadataFileProperties } from 'jsforce';

declare module 'vscode' {
    export namespace window {
        export let forceCode: IForceService;
    }
}

export interface FCWorkspaceMembers {
    [key: string]: IWorkspaceMember;
}

export interface Config {
    apiVersion?: string;
    autoCompile?: boolean;
    autoRefresh?: boolean;
    browser?: string;
    checkForFileChanges?: boolean;
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

export class ConnectionOptions {
    oauth2?: any; // 	OAuth2 | Object	<optional> // OAuth2 instance or options to be passed to OAuth2 constructor
    logLevel?: string; // 	String	<optional> // Output logging level (DEBUG|INFO|WARN|ERROR|FATAL)
    version?: string; // 	String	<optional> // Salesforce API Version (without "v" prefix)
    maxRequest?: number; // 	Number	<optional> // Max number of requests allowed in parallel call
    loginUrl?: string; // 	String	<optional> // Salesforce Login Server URL (e.g. https://login.salesforce.com/)
    instanceUrl?: string; // 	String	<optional> // Salesforce Instance URL (e.g. https://na1.salesforce.com/)
    serverUrl?: string; // 	String	<optional> // Salesforce SOAP service endpoint URL (e.g. https://na1.salesforce.com/services/Soap/u/28.0)
    accessToken?: string; // 	String	<optional> // Salesforce OAuth2 access token
    sessionId?: string; // 	String	<optional> // Salesforce session ID
    refreshToken?: string; // 	String	<optional> // Salesforce OAuth2 refresh token
    signedRequest?: string; // 	String | Object	<optional> // Salesforce Canvas signed request (Raw Base64 string, JSON string, or deserialized JSON)
    proxyUrl?: string; // 	String	<optional> // Cross-domain proxy server URL, used in browser client, non Visualforce app.
    callOptions?: any; // 	Object	<optional> // Call options used in each SOAP/REST API request. See manual.
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
    declarations?: IDeclarations;
    codeCoverage?: {};
    codeCoverageWarnings?: ICodeCoverageWarning[];
    // symbolTable?: any;
    containerId?: string;
    statusInterval: any;    
    workspaceMembers: FCWorkspaceMembers;
    containerMembers: IContainerMember[];
    containerAsyncRequestId?: string;
    conn?: jsforce.Connection;
    username?: string;
    userInfo?: {id: string};
    outputChannel: vscode.OutputChannel;
    statusBarItem_UserInfo: vscode.StatusBarItem;
    statusBarItem: vscode.StatusBarItem;
    connect(context: vscode.ExtensionContext): Promise<IForceService>;
    newContainer(force: Boolean): Promise<IForceService>;
    showStatus(message: string): void;
    clearLog(): void;
    resetStatus(): void;
    checkForFileChanges(): any;
    updateFileMetadata(newMembers, check?: boolean): Promise<any>;
    compareDates(serverDate: string, localDate: string): boolean;
}


export interface ForceCodeError {
    message: string;
}
