# ForceCode for Visual Studio Code

[![Version](http://vsmarketplacebadge.apphb.com/version/JohnAaronNelson.ForceCode.svg)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)
[![Installs](http://vsmarketplacebadge.apphb.com/installs/JohnAaronNelson.ForceCode.svg)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating/JohnAaronNelson.ForceCode.svg)](https://vsmarketplacebadge.apphb.com/rating/JohnAaronNelson.ForceCode.svg)

This extension is a companion for SFDC development with Visual Studio Code.
It is targeted at developers who want a lightweight and fast way to work with their Salesforce files.
There's no complicated setup process or project configurations, no external apps to keep open, and no jarring errors knocking you out of your flow.

To get syntax highlighting, make sure you install the Visualforce and Apex extensions.

## Issues

Please submit any issues to <https://github.com/celador/ForceCode/issues>
I use this extension every day, so if there is something not working, I would appreciate it if you explained your error so I can fix it.

## Features

* Execute Anonymous
* View Debug Logs
* Open / Retrieve a file
* Save / Compile / Deploy a file
  * Works with Classes, Triggers, Components, Pages, Permission Sets, Objects, and Lightning Components
  * Provides line errors in the editor
* Retrieve Package
* Bundle & Deploy Static Resource
* Create Classes from templates
* Deploy Package

## Configuration

To begin, press `Opt+Cmd+C` or open the Command Pallet and type `>ForceCode: Menu` to bring up the ForceCode Menu
You can then enter your credentials to login to your Salesforce org.  Your configuration file will be stored in the base project directory as `force.json`.
The configuration file should look something like...

``` json
{
    "username": "MonsterMike@Salesforce.com",
    "password": "YourPasswordHere",
    "url": "https://login.salesforce.com",
    "autoCompile": true,
    "autoRefresh": true,
    "browser": "Google Chrome Canary",
    "poll": 1500,
    "pollTimeout": 120,
    "debugOnly": false,
    "apiVersion": "37.0",
    "prefix": "namespace",
    "src": "src",
    "deployOptions": {
        "checkOnly": false,
        "testLevel": "RunLocalTests",
        "verbose": false,
        "ignoreWarnings": false
    }
}
```

It's probably best to go ahead and create your config file `force.json` in the root of your workspace.  Copy the below configuration and fill in the values.
Note: the password is in the format "passwordtoken".  Do not try to use any delimiters.

### Options

* username: The username for the org you want to connect to.
* password: The password, with security token, for your user.
* autoCompile: When a supported file is saved (works with VSCode's autosave feature) the file is saved/compiled on the server.  Otherwise, use `cmd + opt + s` to save the file to the server.
* autoRefresh: If autoCompile is on, and you're working in a resource-bundles folder, the staticResource will automatically compile and deploy to your org.  If autoRefresh is on, the currently active tab in Google Chrome Canary will be refreshed.  This provides a simple browsersync-like experience without the overhead of browsersync
* browser: Define which browser you want to reload when the static resource refreshes
* url: This is the login url for Salesforce.  It's either login.salesforce.com for Developer and Professional editions or test.salesforce.com for sandboxes.
* poll: When compiling, this is the interval at which we poll the server for status updates.  This is only applicable to Classes, Pages, Triggers, and Components.
* pollTimeout: When retrieving packages, or other long running tasks, this is the maximum amount of time (in seconds) it will wait before the process times out.  If you're having trouble retrieving your package, try increasing this number.  Max is 600 (10 minutes).
* debugOnly: When executing anonymous, we can either show all the output or only the debug lines.  This makes it easier to debug your code.  Turn if on for the important stuff, and turn it off to get all the detail.
* apiVersion: This is the default api version that all your files will be saved with.  If this is not set, this will default to the version of the org in use.  ForceCode will not change the version of an existing file.  This is also the version used for package retrieval.
* prefix: This is the namespce prefix defined in your package settings for your org.  Set this if you have a namespaced org.  Otherwise it will attempt to infer a prefix from the filename.  If you have a namespaced org and do not set this setting, you will have problems.
* src: This is the src folder that contains your project files

**Special Note**:

By default, VSCode will close the "quick open" dialog, making it difficult to copy/paste your user credentials.  
Use the following setting to force the dialog to remain open when the window loses focus.  
`"workbench.quickOpen.closeOnFocusLost": false`

## Get errors as you type

The Auto-compile feature adds a hook to the save command that will automatically deploy and compile your code to your SFDC org whenever you save.
This works great with VSCode's autosave feature, providing errors as you type.

## Commands

ForceCode provides a number of commands to work with your Salesforce org and metadata.  

### Execute Anonymous

Manu: \>Force: Execute Anonymous  
Mac: alt + cmd + e  
Win: ctrl + shift + e  
Open any file, untitled or otherwise, and use the key combo to run the code and get back the results in the output pane. I usually name my file something like anonymous.apex  
I've also applied the .apex extension to the Apex languge syntax.  Doing this allows you to more easily differentiate between your anonymous scratch files and actual apex classes.  
To only show the User Debug lines, you can set the `debugOnly` setting to `true`

### Compile

Menu: \>Force: Save/Deploy/Compile  
Mac: alt + cmd + s  
Win: ctrl + shift + s  
To automatically compile/save your changes to Salesforce when the file is saved locally, you can set the `autoCompile` setting to `true`.
Otherwise, you will need to use alt + cmd + s to save/compile your file.

### Open

Menu: \>Force: Get Class, Page, or Trigger  
Mac: alt + cmd + o  
Win: ctrl + shift + o  

### Run Apex Unit Tests

Menu: \>ForceCode Menu... Run Unit Tests  
Mac: alt + cmd + t  
Win: ctrl + shift + t  
Run the tests in the currently open file.  
For easy and fun TDD, keep the class you're working on open in one pane, and your tests in the other. 
AutoCompile means you The tests will execute and output the results below.
 

### Bundle and Deploy Static Resource

Menu: \>Force: Save/Deploy/Compile  
Mac: alt + cmd + b  
Win: ctrl + shift + b  

### Build package.xml

Menu: \>ForceCode Menu ... Package-xml  

Generate a package.xml file in your src directory based on its contents. You can give the package a name, which makes your package easy to retrieve later on, or you can generate a package without a name. You can then use this package.xml to deploy your package.  

### Deploy Package

Menu: \>ForceCode Menu ... Deploy Package  

Deploy your package based on your configured deploy options and the package.xml in your src folder.

**Options**:
  * checkOnly:       Validation only deploy.  Don't actually deploy your code, just make sure it all compiles as a package.  This will generate a `.validationId` file.
  * ignoreWarnings:  Indicates whether a warning should allow a deployment to complete successfully (true) or not (false).
  * rollbackOnError: Indicates whether any failure causes a complete rollback (true) or not (false)
  * testLevel:       Specifies which tests are run as part of a deployment Options are: NoTestRun / RunSpecifiedTests / RunLocalTests / RunAllTestsInOrg
  * runTests:        A list of Apex tests to run during deployment (commma separated list)
  * verbose:         Output execution detail log to a `DeployStatistics.log` file
  
If you want destructive changes as part of the deploy, put a `destructiveChanges.xml` file in your src folder

Derived from https://jsforce.github.io/blog/posts/20151106-jsforce-metadata-tools.html


### Retrieve Package

Menu: \>ForceCode Menu ... Retrieve Package  
The `apiVersion` setting is used to retrieve your package (this setting is important in CI setups) comes directly from your org.  When you want to override your Salesforce org version, set the `apiVersion` setting manually.  This is a string, with the decimal.
The `pollTimeout` setting is used to determine how long you should wait for the retrieve command to complete.  This should usually take less than a minute, but can take longer with large packages.

### Get Log

Menu: \>Force: Get Logs

### Create Class

Menu: \>ForceCode Menu ... Create Class  
This will automatically create classes based on `apiVersion` else it defaults to '37.0'.

**SPECIAL NOTE**  
You can create Classes, Triggers, Components, and Pages by simply creating the file anywhere in your project structure.
When you save it, it'll create the file if it doesn't exist, and update it if it does.
The manual process doesn't automatically create the meta.xml file, so doesn't work seamlessly with CI.  However there's no easier way to connect to your org, open a file, modify it and save it back to your org.  This means working with multiple orgs is easier than ever.

## Future goals

* Test runner (kind of done)

* Intellisense code completion
* Debug Apex code with breakpoints in the editor
* Integrate with Yo Force to provide scaffolding of files.
