export default {
    openOrg : {
        description: 'Open project org',
        detail: 'Open the org this project is associated with in a browser.',
        icon: 'browser',
        label: 'Open Org in browser',
    },
    dxLogout : {
        description: 'Log out from current org',
        detail: 'Log out of the current org in this project.',
        icon: 'key',
        label: 'Log out of Salesforce',
    },
    codeCompletionRefresh : {
        description: 'Refresh objects from org',
        detail: 'You must login to DX first or if you receive errors. Allows code completion with custom fields and objects by downloading org data.',
        icon: 'broadcast',
        label: 'Code Completion Refresh',
    },
    dx : {
        description: 'Salesforce DX Commands',
        detail: 'Run DX commands, just like on a command line.',
        icon: 'broadcast',
        label: 'Salesforce DX',
    },
    // Enter Salesforce Credentials
    enterCredentials : {
        description: 'Enter the credentials you wish to use.',
        detail: 'If you are already logged in, you will be logged out of your previous session.',
        icon: 'key',
        label: 'Log in to Salesforce',
    },
    // Execute Anonymous 
    // Execute Selected Code
    executeAnonymous: {
        description: 'Execute code and get the debug log',
        detail: 'If you have a block of text selected, it will run that, otherwise it will use the text of the active file.',
        icon: 'terminal',
        label: 'Execute Anonymous',
    },
    // Compile/Deploy
    compileDeploy: {
        description: 'Save the active file to your org.',
        detail: 'If there is an error, you will get notified. To automatically compile Salesforce files on save, set the autoCompile flag to true in your settings file',
        icon: 'rocket',
        label: 'Compile/Deploy',
    },
    // Export Package (Deploy via Metadata API, using Package.xml)
    deployPackage: {
        description: 'Deploy your package.',
        detail: 'If you have a directory with a package.xml, you will get the option to deploy it.',
        icon: 'package',
        label: 'Deploy Package',
    },
    // Retrieve Package
    retrievePackage: {
        description: 'Retrieve metadata to your src directory.',
        detail: 'You will be prompted for the package name or you can choose to retrieve by your package.xml or to retrieve all metadata',
        icon: 'cloud-download',
        label: 'Retrieve Package/Metadata',
    },
    // Get Log(s)
    getLogs: {
        description: 'Display a list of the last ten logs.',
        detail: 'Get recent logs',
        icon: 'unfold',
        label: 'Get Logs',
    },
    // Open File
    openFile: {
        description: 'Open Classes, Pages, Triggers, and Components',
        detail: 'Open a file from the cloud (aka "refresh from org").',
        icon: 'desktop-download',
        label: 'Open Salesforce File',
    },
    // Build/Deploy Resource Bundle(s)
    resourceBundle: {
        description: 'Build and Deploy a resource bundle.',
        detail: 'Create the Static Resource from the resource-bundle folder and deploy it to your org.',
        icon: 'file-zip',
        label: 'Build Resource Bundle',
    },
    // Create Classes
    createClass: {
        description: 'Create a Repository, Model, Service, Controller, or Custom class.',
        detail: 'Creates classes based on common separation of concerns patterns',
        icon: 'plus',
        label: 'Create Class',
    },
    // Run SOQL
    soql: {
        description: 'Run a SOQL query',
        detail: 'The SOQL query results will be dumped to a json file in the soql directory',
        icon: 'telescope',
        label: 'SOQL Query',
    },
    // Run Tooling Query
    toql: {
        description: 'Run a Tooling API query',
        detail: 'The Tooling API query (Select SymbolTable From ApexClass) results will be dumped to a json file in the toql directory',
        icon: 'telescope',
        label: 'Tooling Query',
    },
    // Diff Files
    diff: {
        description: 'Diff the current file with what is on the server',
        detail: 'Diff the file',
        icon: 'diff',
        label: 'Diff',
    },
}
