// Compiled using typings@0.6.6
// Source: https://raw.githubusercontent.com/celador/typed-jsforce/master/jsforce.d.ts
// Type definitions for jsforce v1.5.1
// Project: https://github.com/jsforce/jsforce
// Definitions by: JohnAaronNelson <https://github.com/celador>

declare module 'jsforce/index' {
  namespace jsforce {
    interface jsforce extends NodeJS.EventEmitter {
      Connection(options: ConnectionOptions): Connection;
    }
    interface ExecuteAnonymousResponse {
      body: {
        result: ExecuteAnonymousResult;
      };
      header: {};
    }
    interface ExecuteAnonymousResult {
      column: string; // Column number for the error
      compiled: string; // Flag if the query is compiled successfully
      compileProblem: string; // Error reason in compilation
      exceptionMessage: {}; // Exception message
      exceptionStackTrace: {}; // Exception stack trace
      line: string; // Line number for the error
      success: string; // Flag if the code is executed successfully
    }
    interface SObject {
      find(config?: {}, fields?: {}): any;
      create(records: Array<any>, options?: {}): Promise<Array<RecordResult>>;
      create(records: Array<any>, options?: {}, callback?: () => {}): Array<RecordResult>;
      create(record: any): Promise<RecordResult>;
      create(record: any, options?: {}, callback?: () => {}): RecordResult;
      upsert(record: any, options?: {}, callback?: () => {}): RecordResult;
      retrieve(ids: Array<string>, options?: {}, callback?: () => {}): Array<RecordResult>;
      update(records: Array<any>, options?: {}): Promise<Array<RecordResult>>;
      update(records: Array<any>, options?: {}, callback?: () => {}): Array<RecordResult>;
      update(record: any): Promise<RecordResult>;
      update(record: any, options?: {}, callback?: () => {}): RecordResult;
      del(ids: Array<string>, callback?: () => {}): Array<RecordResult>;
      del(id: string, callback?: () => {}): Array<RecordResult>;
    }
    interface Tooling {
      sobject(name: string): SObject;
      completions(type?: string): Promise<CompletionResult>;
      executeAnonymous(apexBody: string): Promise<ExecuteAnonymousResult>;
      runTestsAsynchronous(classIds: string[]): Promise<any>;
      runTestsSynchronous(classNames: string[]): Promise<any>;
      runUnitTests(classId: string): Promise<any>;
      query(query: string): Promise<QueryResult>;
      queryMore(locator: string): Promise<QueryResult>;
      describeGlobal(): Promise<ToolingDescribeResult>;
    }
    interface ToolingDescribeResult {
      encoding: string;
      maxBatchSize: number;
      sobjects: SObjectDescription[];
    }
    interface SObjectDescription {
      activateable: boolean;
      createable: boolean;
      custom: boolean;
      customSetting: boolean;
      deletable: boolean;
      deprecatedAndHidden: boolean;
      feedEnabled: boolean;
      hasSubtypes: boolean;
      isSubtype: boolean;
      keyPrefix: string;
      label: string;
      labelPlural: string;
      layoutable: boolean;
      mergeable: boolean;
      mruEnabled: boolean;
      name: string;
      queryable: boolean;
      replicateable: boolean;
      retrieveable: boolean;
      searchable: boolean;
      triggerable: boolean;
      undeletable: boolean;
      updateable: boolean;
      urls: {
        rowTemplate: string;
        defaultValues: string;
        describe: string;
        sobject: string;
      };
    }
    interface CompletionResult {
      publicDeclarations: {};
    }
    interface DeployResult {
      id: string;
      done: boolean;
      true: boolean;
      state: string;
      numberComponentErrors: number;
      numberComponentsDeployed: number;
      numberTestsCompleted: number;
      check(callback: (err: any, result: any) => any): any;
      complete(callback: (err: any, result: any) => any): any;
    }
    interface RetrieveResult {
      id: string;
    }
    interface RetrieveResultLocator {
      stream(): NodeJS.ReadableStream;
      then(): Promise<any>;
    }
    interface IMetadataFileProperties {
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
    interface Metadata {
      pollTimeout: number;
      pollInterval: number;
      describe(): Promise<any>;
      checkDeployStatus(processId: string, {}): Promise<any>;
      checkRetrieveStatus(id: string): Promise<any>;
      list(queries: any[], version?: string): Promise<IMetadataFileProperties[]>;
      retrieve({}): {
        stream(): NodeJS.ReadableStream;
        on(event: string, callback: (res: any) => any): any;
      };
      retrieve({}): Promise<RetrieveResult>;
      deploy({}, {}): DeployResult;
      upsert(foo: string, bar: any): Promise<any>;
    }
    interface Bulk {
      pollInterval: number;
      pollTimeout: number;
      load(
        type: string,
        operation: string,
        csvStream: any,
        callback: (err: any, rets: any) => any
      ): any;
    }
    // Connection
    interface Connection {
      bulk: Bulk;
      soap: any;
      debuggingHeader: any;
      version: string;
      metadata: Metadata;
      tooling: Tooling;
      limitInfo: any;
      request: any;
      query: any;
      accessToken: string;
      instanceUrl: string;
      sobject(name: string): SObject;
      search(searchString: string, callback: (err: any, res: any) => void): any;
      identity(callback?: (err: any, res: any) => void): any;
      login(name: string, password: string): any;
      login(name: string, password: string, callback: (err: any, res: any) => void): any;
      _baseUrl(): string;
    }
    interface ConnectionOptions {
      oauth2?: OAuth2 | {}; // OAuth2 instance or options to be passed to OAuth2 constructor
      logLevel?: string; // Output logging level (DEBUG|INFO|WARN|ERROR|FATAL)
      version?: string; // Salesforce API Version (without "v" prefix)
      maxRequest?: number; // Max number of requests allowed in parallel call
      loginUrl?: string; // Salesforce Login Server URL (e.g. https://login.salesforce.com/)
      instanceUrl?: string; // Salesforce Instance URL (e.g. https://na1.salesforce.com/)
      serverUrl?: string; // Salesforce SOAP service endpoint URL (e.g. https://na1.salesforce.com/services/Soap/u/28.0)
      accessToken?: string; // Salesforce OAuth2 access token
      sessionId?: string; // Salesforce session ID
      refreshToken?: string; // Salesforce OAuth2 refresh token
      signedRequest?: string | {}; // Salesforce Canvas signed request (Raw Base64 string, JSON string, or deserialized JSON)
      proxyUrl?: string; // Cross-domain proxy server URL, used in browser client, non Visualforce app.
      callOptions?: {}; // Call options used in each SOAP/REST API request. See manual.
    }
    interface OAuth2 {
      loginUrl?: string; // Salesforce login server URL
      authzServiceUrl?: string; // OAuth2 authorization service URL. If not specified, it generates from default by adding to login server URL.
      tokenServiceUrl?: string; // OAuth2 token service URL. If not specified it generates from default by adding to login server URL.
      clientId: string; // OAuth2 client ID.
      clientSecret: string; // OAuth2 client secret.
      redirectUri: string; // URI to be callbacked from Salesforce OAuth2 authorization service.
    }

    // Login
    interface UserInfo {
      id: string; // User ID
      organizationId: string; // Organization ID
      url: string; // Identity URL of the user
    }

    interface DebugLevel {
      ApexCode?: string;
      ApexProfiling?: string;
      Callout?: string;
      Database?: string;
      DeveloperName: string;
      Language?: string;
      MasterLabel: string;
      System?: string;
      Validation?: string;
      Visualforce?: string;
      Workflow?: string;
    }
    interface TraceFlagOptions {
      ApexCode?: string;
      ApexProfiling?: string;
      Callout?: string;
      Database?: string;
      DebugLevelId?: string;
      ExpirationDate: string; // Datetime
      LogType?: string; // USER_DEBUG
      StartDate?: string; // Datetime
      System?: string;
      TracedEntityId?: string; // UserId
      Validation?: string;
      Visualforce?: string;
      Workflow?: string;
    }

    interface RecordResult {
      success: boolean; // The result is succeessful or not
      id?: string; // Record ID
      errors?: Array<string>; // Errors (available when success = false)
    }

    interface QueryResult {
      done: boolean; // Flag if the query is fetched all records or not
      nextRecordsUrl?: string; // URL locator for next record set, (available when done = false)
      totalSize: number; // Total size for query
      locator: string; // Total size for query
      records: Array<any>; // Array of records fetched
    }
  }
  export = jsforce;
}
declare module 'jsforce' {
  import * as main from 'jsforce/index';
  export = main;
}
