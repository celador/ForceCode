// Type definitions for jsforce
// Project: https://github.com/jsforce/jsforce
// Definitions by: JohnAaronNelson JohnAaronNelson.com
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

// Compiled using typings@0.6.2
// Source: https://raw.githubusercontent.com/typings/typed-jsforce/a7e422c5455e70292e5675a727d43a7b05fc3e58/index.d.ts
declare module 'jsforce/index' {
    
    interface OAuth2 {
        loginUrl?: string; // Salesforce login server URL
        authzServiceUrl?: string; // OAuth2 authorization service URL. If not specified, it generates from default by adding to login server URL.
        tokenServiceUrl?: string; // OAuth2 token service URL. If not specified it generates from default by adding to login server URL.
        clientId: string; // OAuth2 client ID.
        clientSecret: string; // OAuth2 client secret.
        redirectUri: string;  // URI to be callbacked from Salesforce OAuth2 authorization service.
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

    interface jsforceExports {
        Connection: any;
        // constructor(options: { enabled: boolean }): jsforce;

        // styles: Styles<StyleElement>;
        // supportsColor: boolean;
        // hasColor(value: string): boolean;
        // stripColor(value: string): string;
    }

    var jsforce: jsforceExports;

    export = jsforce;
}