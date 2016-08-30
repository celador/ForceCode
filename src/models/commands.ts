export default {
    // Enter Salesforce Credentials
    enterCredentials : {
        description: 'Enter the credentials you wish to use.',
        detail: 'If you are already logged in, you will be logged out of your prebious session.',
        icon: 'key',
        label: 'Enter Credentials',
    },
    // Execute Anonymous 
    // Execute Selected Code
    executeAnonymous: {
        description: 'Execute code and get the debug log',
        detail: 'If you have a block of text selected, it will run that, otherwise it will use the text of the active file.',
        icon: 'bug',
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
        description: 'Deploy the entire package.',
        detail: 'If you have a ./src/package.xml file, it will deploy the entire package.',
        icon: 'package',
        label: 'Deploy Package',
    },
    // Retrieve Package
    retrievePackage: {
        description: 'Retrieve the entire contents of a package to your src directory.',
        detail: 'You will be asked for the package name.',
        icon: 'cloud-download',
        label: 'Retrieve Package',
    },
    // Get Log(s)
    getLogs: {
        description: 'Display a list of the last ten logs.',
        detail: 'to be improved',
        icon: 'unfold',
        label: 'Get Logs',
    },
    // Open File
    openFile: {
        description: 'Open Classes, Pages, Triggers, and Components',
        detail: 'to be expanded',
        icon: 'file-text',
        label: 'Open Salesforce File',
    },
    // Build/Deploy Resource Bundle(s)
    resourceBundle: {
        description: 'Build and Deploy a resource bundle.',
        detail: 'Uses the MavensMate convention of a resource-bundle foleder',
        icon: 'flame',
        label: 'Build Resource Bundle',
    },
    // Create Classes
    createClass: {
        description: 'Create a Service, Domain, Selector class.',
        detail: 'Finds your classes folder and inserts the metadata and class specified by user input',
        icon: 'code',
        label: 'Create Class'
    }
}
