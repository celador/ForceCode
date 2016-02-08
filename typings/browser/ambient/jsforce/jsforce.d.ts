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

        interface ExecuteAnonymousResult {
            compiled: boolean; // Flag if the query is compiled successfully
            compileProblem: string; // Error reason in compilation
            success: boolean; // Flag if the code is executed successfully
            line: number; // Line number for the error
            column: number; // Column number for the error
            exceptionMessage: string; // Exception message
            exceptionStackTrace: string; // Exception stack trace
        }
        interface SObject {
            find(config: {});
            create(records: Array<any>, options?: {}): Thenable<Array<RecordResult>>;
            create(records: Array<any>, options?: {}, callback?: () => {}): Array<RecordResult>;
            create(record: any): Thenable<RecordResult>;
            create(record: any, options?: {}, callback?: () => {}): RecordResult;
            retrieve(ids: Array<string>, options?: {}, callback?: () => {}): Array<RecordResult>;
            update(records: Array<any>, options?: {}): Thenable<Array<RecordResult>>;
            update(records: Array<any>, options?: {}, callback?: () => {}): Array<RecordResult>;
            update(record: any): Thenable<RecordResult>;
            update(record: any, options?: {}, callback?: () => {}): RecordResult;
            del(ids: Array<string>, callback?: () => {}): Array<RecordResult>;
            del(id: string, callback?: () => {}): Array<RecordResult>;
        }
        interface Tooling {
            sobject(name: string): SObject;
            executeAnonymous(apexBody: string): Promise<ExecuteAnonymousResult>;
            query(locator: string):  Thenable<QueryResult>;
        }
        // Connection
        interface Connection {
            tooling: Tooling;
            request: any;
            query: any;
            accessToken: string;
            instanceUrl: string;
            identity(): any;
            login(name: string, password: string): any;
            login(name: string, password: string, callback:(err: any, res: any) => void): any;
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
            redirectUri: string;  // URI to be callbacked from Salesforce OAuth2 authorization service.
        }
    
        // Login
        interface UserInfo {
            id: string; // User ID
            organizationId: string; // Organization ID
            url: string; // Identity URL of the user
        }

        interface RecordResult {
            success: boolean        // The result is succeessful or not
            id?: string    // Record ID
            errors?: Array<string> // Errors (available when success = false)
        }

        interface QueryResult {
            done: boolean; // Flag if the query is fetched all records or not
            nextRecordsUrl?: string; // URL locator for next record set, (available when done = false)
            totalSize: number; // Total size for query
            records: Array<any>; // Array of records fetched
        }

    }
    export = jsforce;
}
declare module 'jsforce' {
    import * as main from 'jsforce/index';
    export = main;
}
