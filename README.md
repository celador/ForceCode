[![Logo](https://raw.githubusercontent.com/celador/ForceCode/master/images/logo-type.png)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)

# ForceCode for Visual Studio Code

[![Version](https://vsmarketplacebadge.apphb.com/version/JohnAaronNelson.ForceCode.png)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)
[![Installs](https://vsmarketplacebadge.apphb.com/installs/JohnAaronNelson.ForceCode.png)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating/JohnAaronNelson.ForceCode.png)](https://vsmarketplacebadge.apphb.com/rating/JohnAaronNelson.ForceCode.svg)
[![Build Status](https://daishi4u.visualstudio.com/Forcecode/_apis/build/status/ForceCodeOrig)](https://daishi4u.visualstudio.com/Forcecode/_build?definitionId=2)
![Azure DevOps coverage](https://img.shields.io/azure-devops/coverage/daishi4u/Forcecode/2.svg)

## Overview

This extension is a companion for SFDC (Salesforce.com) development with Visual Studio Code.  
It is targeted at developers who want a lightweight and fast way to work with their Salesforce files.  
There's no complicated setup process or project configurations, no external apps to keep open, and no jarring errors knocking you out of your flow.

## IMPORTANT

As of version 3.17.0, you will be required to install the SFDX-CLI on your system in order for this extension to function! Please download from [https://developer.salesforce.com/tools/sfdxcli](https://developer.salesforce.com/tools/sfdxcli) and install, then restart Visual Studio Code. The ability to run a DX command via the ForceCode menu has also been removed because of this change. The extension size has been dramatically reduced because of this change (Went from ~50MB unpackaged to under 2MB!).

## Slack

ForceCode now has a Slack channel! Click [here](https://join.slack.com/t/forcecodeworkspace/shared_invite/enQtNDczMDg3Nzg2ODcxLWRhYWM2NmI3MGNmMmE1MmRkOTFkMGQzZmQ1YjlhMDhjY2YzNmU0NDEyNDU4OGM1NzdlZjU2NTg3Y2FkNTdhMjA) to join us! 
Use this to ask question and receive updates on upcoming features!

### Permissions

Please note that the following permissions are required to develop on the Force.com platform: [https://developer.salesforce.com/docs/atlas.en-us.pages.meta/pages/pages_intro_permissions.htm](https://developer.salesforce.com/docs/atlas.en-us.pages.meta/pages/pages_intro_permissions.htm)

## Features

* For code completion and highlighting I highly recommend downloading the various Salesforce language server extensions.
    * Follow the installation instructions on the Apex Code Editor page (You must install the Salesforce cli for code smartness to work!)
    * For apex code completion, select code completion refresh from the ForceCode menu and it will work with the Salesforce apex language server extension. You will need to refresh for each org. ForceCode handles the rest and switches code completion files when switching orgs/usernames.
* Edit and save almost everything in Salesforce textually (Workflows, classes, lead assignment rules, etc..)
    * Now works with the autoCompile option. Save the file and Salesforce will send it to the org (If this option is on).
* View save history results for x number of saves (maxSaveHistory setting) and view any error messages from the save by hovering over the save result (File name of the save)
* Right click on a file in the explorer to save.
* Right click on a file or folder to refresh from the server.
* Multiple org support. Log into each org through ForceCode and you won't need to log out to switch orgs, simply click on another org in the "Saved Usernames" view and ForceCode will log you in.
    * You can now right-click on a username to switch/login/logout of an org. When logging out using this method you don't need to switch to the org you're logging out of.
* Open Classes, Triggers, Visualforce pages, and Visualforce components by right clicking and selecting open
    file in org.
* Simple graphical settings editor.
    * Allows for settings for each org.
* Open org in the browser. No more need to open a browser and login to salesforce.
* Preview Visualforce pages/Lightning apps.
    * Either right click and select preview or click the icon that appears in the upper right.
* Task view. See what ForceCode is up to and execute multiple commands at the same time.
* Code Coverage view. Will show the coverage on files open in your project.
    * You can even have this view revealed after running an apex test.
* Retrieves code coverage on startup of the extension.
* Search in files. Works just like the developer console search in files feature.
* Retrieve org-wide code coverage. This will show up in a file with all apex classes and their coverage listed.
* Auto comparison of file changes on load/save. Will also show the last person's name that changed the file.
* NO MORE PASSWORDS SAVED IN THE CONFIG FILE!!!
    * Login through the browser and you will be auto logged in through ForceCode every time until you log out.
* Save / Compile / Deploy a file
  * Works with Classes, Triggers, Components, Pages, Permission Sets, Objects, Custom Labels, and Lightning Components
  * Provides line errors in the editor
  * Works great with autosave
* Run Unit Tests
    * Hover over @isTest or testMethod to get a link to run the test class or method
    * Code coverage highlighting in the editor
    * Coverage warnings and percents
    * Errors in the editor on test failures
    * Auto-open test log (If there is output, based on the filter)
    * Easy to run a single tests, or all tests in a Class
* Execute Anonymous 
    * Highlight text, then right click and select "Execute Anonymous" or select "Execute Anonymous" from the ForceCode menu
* View / Save Debug Logs (Use the menu item to get debug logs to save)
* Open / Retrieve a file
  * Works with Classes, Triggers, Components, Pages, Static Resources, and Lightning Components
  * Multiple files can be selected to open from the server.
* Deploy Package
    * You can now choose files in your current org folder to deploy and ForceCode will build a package.xml file and deploy the files!
    * Replaces need for CumulusCI w/ Ant
    * Retrieve detailed deploy information
    * ForceCode now only deploys the files contained in your package.xml! (Yes, destructiveChanges.xml, destructiveChangesPre.xml, and destructiveChangesPost.xml files will deploy as well so be careful!!!)
* Retrieve Package
    * Retrieve all metadata
    * Retrieve by selecting from available Packages
    * Retrieve by package.xml   
    * Retrieve by selecting types
    * Retrieve all classes 
    * Retrieve all pages
    * Retrieve all aura definition bundles (Lightning components, events, apps, etc)
    * Retrieve all custom objects
    * Retrieve all standard objects
* Bundle & Deploy Static Resources on save
    * Auto refresh the browser on save (Mac only)
    * Works great with autosave
* Create Aura components, classes, LWC components, triggers, and Visualforce pages/components
* Diff server & local versions
* SOQL and Tooling query editor
    * Quickly run [SOQL Queries](https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql.htm)
    * Query [Tooling Objects](https://developer.salesforce.com/docs/atlas.en-us.api_tooling.meta/api_tooling/reference_objects_list.htm)
    * Results displayed in a table
    * Results can be saved as JSON or CSV (if outputQueriesAsCSV is checked)
    * Inline edits can be made in the results table (Just like in the developer console)
* Arbitrary folder structure
    * Change your project `src` folder
    * Flexible project structure
* API Limit Warnings (Now a hover, when you hover over usernames in the Saved Usernames view (This also shows the project's path))
* Perform bulk record updates with CSV files (Insert, update, upsert, delete, hard delete)

## FAQ

* Where did the ForceCode: Show Menu command go?
    * To create a project with Forcecode, you should now use the ForceCode: Create Project command.
* Why do I get an error when trying to login about a localhost connection failure?
    * This means your network is either on a proxy or vpn and you will need to go [here](https://salesforce.stackexchange.com/questions/194719/salesforce-dx-proxy-issues) to set up Forcecode to work with this type of connection.

## Issues

Before submitting an issue, please read the FAQ section above to make sure that your issue isn't answered already.
Please submit any issues or feature requests to [https://github.com/celador/ForceCode/issues](https://github.com/celador/ForceCode/issues)  

## Commands

ForceCode provides a number of commands to work with your Salesforce org and metadata.

### Compile

Menu: &gt;Force: Save/Deploy/Compile  
Mac: alt + cmd + s  
Win/Linux: ctrl + shift + s  
To automatically compile/save your changes to Salesforce when the file is saved locally, you can set the `autoCompile` setting to `true`.  
Otherwise, you will need to use the keyboard shortcut or menu option to save/compile your file.
The `pollTimeout` setting is used to determine how long you should wait for the retrieve command to complete.  This should usually take less than a minute, but can take longer with large packages.

#### Get errors as you type

To get code completion and errors as you type you will need to install the Salesforce language server extensions for Apex, Visualforce, and Lightning. Forcecode will create sObjects for use with the Apex extension for code completion (smartness as they call it now)

### Run Apex Unit Tests

Simply hover over an @isTest or testMethod and you will see a ForceCode hover appear. Follow the instructions given and watch the magic happen!!

### Execute Anonymous

Menu: &gt;Force: Execute Anonymous  
Mac: alt + cmd + e  
Win/Linux: alt + shift + e  
Simply select the code that you want to run, then right click and select Execute Anonymous!

### Create scratch org

If your current working org that you are logged into is a DevHub, then you will see the option in the Forcecode menu to create a scratch org. When you choose to do so, you will be asked for the edition, duration in days till expiration, and whether you want the scratch org created with sample data. Once the scratch org is created, you will be able to log into it by clicking on the new username under the saved usernames view.

### Open

Menu: &gt;Force: Get Class, Page, or Trigger  
Mac: alt + cmd + o  
Win/Linux: alt + shift + o

### Bundle and Deploy Static Resource

Menu: &gt;Force: Save/Deploy/Compile  
Mac: alt + cmd + b  
Win/Linux: alt + shift + b
You can also save a file in a resource-bundle folder and it will deploy

ForceCode looks for Static Resources in two places.  The first is `resource-bundles`, the second is `spa`.  Typically, static resources go in the resource-bundles folder, and the resource is named something like `foo.resource` where foo is the name of the static resource.
So, to create a new Static Resource, ensure the resource-bundles folder exists in the src folder of your project.  Then create a new folder named how you want your static resource to be named with `.resource.RESOURCETYPE` at the end of the name(E.G. bootstrap.resource.application.x-zip-compressed).  IF YOU ARE DEPLOYING A SINGLE FILE, SUCH AS A JAVASCRIPT FILE, THEN THE FOLDER NAME NEEDS TO BE EXACTLY THE SAME AS THE JAVASCRIPT FILE (E.G. myResource.resource.application.javascript will be the folder name and myResource.js will be the only file that can live in this folder!!!!!!!!!!!!!!!!!!!!!!!!!!) If you do it any differently then simply put, it won't work!! You can now Bundle and Deploy this Static Resource.
Whenever you save a file that lives in a resource bundles folder, the resource will automatically bundle and deploy to your org.  Use this in conjunction with autoRefresh flag and browser property to get a browsersync-like experience

If you build SPAs, typically you will have a `spa` folder, then another folder named for your static resource, like `spa/foo`.
This folder is your Javascript project, where your package.json lives.
You will build your distribution files to a 'dist' folder or another folder determined by the `spaDist` config property. This folder will live inside `spa/foo` directory, so you will end up with `spa/foo/dist` folder structure. One last note, the spa folder NEEDS to be in your `src` folder!!!

SPA folders do not automatically deploy.  We typically run these offline with `jsr-mocks` and webpack and only deploy when we want to publish.

### Deploy Package

Menu: &gt;ForceCode Menu ... Deploy Package

Deploy your package based on your configured deploy options and the package.xml in your src folder. ForceCode will now only deploy the files contained in the package.xml file. You now have the option to choose files in your current org folder to deploy and ForceCode will build a package.xml file and deploy the files!If it gives you a deploy error, you're most likely missing at least one -meta.xml file!

**Options**:

* checkOnly:       Validation only deploy.  Don't actually deploy your code, just make sure it all compiles as a package.
* ignoreWarnings:  Indicates whether a warning should allow a deployment to complete successfully \(true\) or not \(false\).
* rollbackOnError: Indicates whether any failure causes a complete rollback \(true\) or not \(false\)
* runAllTests:     Run all tests in org
* runTests:        An array of test names to be run [TestClass1, TestClass2,...]

If you want destructive changes as part of the deploy, put a `destructiveChanges.xml` file in your src folder

Derived from [https://jsforce.github.io/blog/posts/20151106-jsforce-metadata-tools.html](https://jsforce.github.io/blog/posts/20151106-jsforce-metadata-tools.html)

### Retrieve Package

Menu: &gt;ForceCode Menu ... Retrieve Package  
The `apiVersion` setting is used to retrieve your package \(this setting is important in CI setups\) comes directly from your org.  When you want to override your Salesforce org version, set the `apiVersion` setting manually.  This is a string, with the decimal.  

### Get Log

Menu: &gt;Force: Get Logs

### Create Class

Menu: &gt;ForceCode Menu ... Create Class  
This will automatically create classes based on `apiVersion` else it defaults to '46.0'.

### Open org

Open the org in a browser. No more logging in!!

### Find

This works just like the "Search Files" feature in the developer console.

### New...

Using this option, you can create Aura components, classes, LWC components, triggers, and Visualforce pages/components. Select what you would like to create, enter the name of the file, and Forcecode will create a basic empty file for you!

### Build package.xml file

This will present to you a list of all the non-foldered types that you want to include in your package.xml. Once you choose the types, you will be asked where you want to save the file. 
    * Reports, documents, etc are foldered and currently not supported

### Get overall org test coverage

Use this option and ForceCode will create a list of all apex classes and their coverage at the time of retrieval. It will also include an estimated overall coverage percentage (This is calculated by adding up all the other data (covered lines/total lines))

### Code Completion Refresh

This will grab all sObject data from Salesforce and allow you to use this extension with the Salesforce Apex language extension for code smartness. Make sure you set up the Apex extension correctly by following the instructions [here](https://forcedotcom.github.io/salesforcedx-vscode/articles/getting-started/install)

### Settings

This will open a ForceCode Settings window where you can change all of the options in your settings.json file in a GUI!

### Bulk Loader

Select this menu option to be taken to a screen where you will be able to upload a CSV file full of record data that you will be able to perform CRUD operations on. Simply select an sObject name, CRUD operation, and upload a CSV. Then click "Execute" and watch the magic happen! If you get a file format error it will be shown on the screen. If there are errors during the CRUD operation then Forcecode will show you a save dialog box asking where you want to save the error file. The error file currently isn't as fancy as dataloader, as the results returned from errors aren't much, but it will tell you the line number(s) in Excel that have the errors, along with what the error was. 

### New Project

Selecting this option will allow you to create a new Forcecode project in a different folder from the one currently open. You will be asked for the new project folder name and will be shown an open dialog so you can choose where to create the new project folder.

## Configuration

To create a Forcecode project, open Visual Studio Code then open the command pallet (Ctrl + Shift + p) and run the `ForceCode: Create Project` command. Select the folder you wish to create a project in then Forcecode will open the folder and ask you to log in.
You can then select if you want to log into a production org or test org. A browser will then open to the Salesforce login where you can enter your credentials. A configuration file will then be auto generated for you for each of your orgs in the .forceCode folder called `settings.json`.  

The configuration file will look like the following. You can either edit this file to change the settings or you can use the settings option in the ForceCode menu (Recommended)!

```json
{
    "alias": "My Sandbox",
    "apiVersion": "45.0",
    "autoCompile": true,
    "deployOptions": {
        "allowMissingFiles": true,
        "checkOnly": false,
        "ignoreWarnings": true,
        "purgeOnDelete": false,
        "rollbackOnError": true,
        "runTests": [],
        "testLevel": "NoTestRun"
    },
    "overwritePackageXML": false,
    "poll": 2000,
    "prefix": "",
    "showTestCoverage": true,
    "spaDist": "dist",
    "src": "src",
    "staticResourceCacheControl": "Private",
    "username": "MonsterMike@Salesforce.com",
    "url": "https://login.salesforce.com"    
}
``` 

### Options

* alias: When set, the alias is what will show in the saved usernames section of the Forcecode view instead of the username. This makes keeping track of orgs easier than remembering each username
* apiVersion: This is the default api version that all your files will be saved with. ForceCode will not change the version of an existing file.  This is also the version used for package retrieval and deploy.
* autoCompile: When a supported file is saved \(works with VSCode's autosave feature\) the file is saved/compiled on the server.  Otherwise, use `cmd + opt + s` (Mac) or `ctrl + shift + s` (Win/Linux) to save the file to the server.
* deployOptions: Deploy your package based on your configured deploy options and the package.xml in your src folder.
  * allowMissingFiles: Specifies whether a deploy succeeds even if files that are specified in package.xml but are not in the .zip file or not.
  * checkOnly:       Validation only deploy.  Don't actually deploy your code, just make sure it all compiles as a package.
  * ignoreWarnings:  Indicates whether a warning should allow a deployment to complete successfully \(true\) or not \(false\).
  * purgeOnDelete: If true, the deleted components in the destructiveChanges.xml manifest file aren't stored in the Recycle Bin.
  * rollbackOnError: Indicates whether any failure causes a complete rollback \(true\) or not \(false\)
  * runTests:        A list of Apex tests to run during deployment \(comma separated list\)
  * testLevel:       Specifies which tests are run as part of a deployment Options are: NoTestRun / RunSpecifiedTests / RunLocalTests / RunAllTestsInOrg
* overwritePackageXML: if set to true, will overwrite package.xml file upon opening or retrieving files
* poll: When compiling, this is the interval \(in milliseconds\) at which we poll the server for status updates.  This is only applicable to Classes, Pages, Triggers, and Components.
* pollTimeout: When retrieving packages, or other long running tasks, this is the maximum amount of time \(in seconds\) it will wait before the process times out.  If you're having trouble retrieving your package, try increasing this number.  Default is 600 \(10 minutes\).
* prefix: This is the namespace prefix defined in your package settings for your org.  Set this if you have a namespaced org.  Otherwise ForceCode will attempt to infer a prefix from your Salesforce Org.  If you have a namespaced org and do not set this setting, you may have problems, especially if working on an out of date Org.  This should be automatic as of Salesforce 38
* showTestCoverage: This flag determines if Apex code coverage highlighting should be shown or hidden in the editor.  This can be toggled for the open editor by clicking the colorful icon in the editor bar.
* spaDist: When working with SPAs we usually have a "distribution" folder where we build our files to.  If this string is set, and a SPA is bundled and deployed, this folder will be used as the distribution folder, otherwise the spa project will be deployed.
* src: This will tell ForceCode where to store the project files for this org.
* staticResourceCacheControl: You can select Public or Private and your static resources will save with the cacheControl set to what this option is set to.
* username: DO NOT TOUCH THIS
* url: DO NOT TOUCH THIS


There's also workspace configuration options that are not included in the settings.json, but rather in your vscode settings.json file. The reasoning for separating the files is for portability reasons; to make it easier to share this configuration with others and yourself across projects.  
If you open up your settings.json file, or go to Code &gt; Preferences &gt; Workspace Settings and create a new preference, starting with `force` you should see the defaultApiVersion and filesExclude preferences. The defaultApiVersion will be what ForceCode uses as the API version when creating new projects or logging into new orgs. 
The filesExclude property allows you to have certain files ignored \(excluded\) from Static Resources when bundled/deployed.  This allows you to create a modern SPA project in a "spa" folder instead of keeping it in your "resource-bundles" directory.  
However, when we build these SPAs we generally have a ton of preference and source files that we don't want to deploy to Salesforce, both for security and size reasons.  
So, you can create Node glob patterns to ignore. The default configuration is shown below.  
Glob patterns can be tricky... so a little research and trial and error may be required to get your bundle just right.

```json
{
    ".gitignore": true,
    ".DS_Store": true,
    ".org_metadata": true,
    "**/*.map": true,
    "node_modules/**": true,
    "bower_modules/**": true,
    "**.tmp": true,
    "**/*-meta.xml": true,
    ".log": true
}
```

The following settings have been migrated to the workspace settings as well:
* allowAnonymousUsageTracking: Checking this will allow the Forcecode team to track anonymous usage data so that we can improve your overall experience.
* autoRefresh: If autoCompile is on, and you're working in a resource-bundles folder, the staticResource will automatically compile and deploy to your org.  If autoRefresh is on \(and you're working on a Mac\), the currently active tab in Google Chrome Canary \(or your configured browser\) will be refreshed.  This provides a simple browsersync-like experience without the overhead of browsersync
* browser: Define which browser you want to reload when the static resource refreshes \(this only works with Macs at the moment\)
* bulkLoaderPollInterval: The amount of time in milliseconds between updates when doing bulk CRUD operations.
* bulkLoaderPollTimeout: The amount of time, in milliseconds, to wait for a bulk load operation to complete before timing out. Default is 60000 (1 minute
* checkForFileChanges: This option, when checked, will allow ForceCode to check for file changes against the server on startup of ForceCode.
* debugFilter: A regular expression used to match a line for display. The default is to show debug and error lines, so you can filter out the log noise.
* debugOnly: When executing anonymous, we can either show all the output or only the debug lines.  This makes it easier to debug your code.  Turn if on for the important stuff, and turn it off to get all the detail.
* maxFileChangeNotifications: The maximum number of file change notifications that will be shown on startup of the extension
* maxQueryHistory: The maximum number of queries to store in the query history of the query editor
* maxQueryResultsPerPage: The maximum number of results to show per page when executing a query in the query editor
* maxSaveHistory: The maximum number of save history results to show in the Forcecode view. The default is 10.
* onlyShowProjectUsernames: If checked, Forcecode will only show the usernames in use in each project instead of every one that has been authenticated on your machine.
* outputQueriesAsCSV: If checked, will retrieve soql/toql results in csv form. If false, json will be returned
* revealTestedClass: When checked, this will reveal the class (In the code coverage view) that received the highest amount of coverage from running a test. I say this because if you don't have the tested class in your src folder then it will show the next highest covered class in your project. If none are found then it won't be revealed.
* setDefaultUsernameOnLogin: When checked, Forcecode will update the SFDX CLI default username to the current logged in org each time you switch usernames. This allows you to use Forcecode alongside of the Salesforce extensions, so you don't need to worry about changing the default username each time you switch orgs.
* showFilesOnOpen: If checked, will open files in the editor when opened from Salesforce
* showFilesOnOpenMax: The maximum number of files to open in the editor. More than 3 usually causes problems or doesn't work.
* showTestLog: This flag determines if the Log file for the last test run should show up after the tests are complete.  This is nice for debugging tests.  Use this in conjunction with the other debug flags to keep your output tidy. The log file will only show if it's not empty (Because of filtering).

## Help Develop ForceCode 

### Clone the repo

Step 1.  Clone this repo to your local machine, like you would with any other Git repository.

### Open the folder

Step 2.  Open the folder you just created when you cloned the repo in VSCode.

### Install the dependencies

Step 3.  Open the terminal by pressing `ctrl` + `~` and install the dependencies by running `npm ci`.

### Run the extension

Step 4.  Press F5 to start debugging the extension. Another VSCode window will open up, which will host your extension.  Open your Salesforce project and start working.

### Debug the extension

Step 5.  Find the file for the command you want to run and debug, and put in a breakpoint. Run the command to hit the breakpoint and start exploring the variables.  

Step 6.  Have Fun!


## Change Log

* The change log has been moved to the CHANGELOG.md file. You should be able to view this information on the extension's home page.
