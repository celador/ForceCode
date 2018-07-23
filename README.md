[![Logo](https://raw.githubusercontent.com/celador/ForceCode/master/images/logo-type.png)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)

# ForceCode for Visual Studio Code

These will eventually be replaced. They are based on the original extension.
[![Version](https://vsmarketplacebadge.apphb.com/version/JohnAaronNelson.ForceCode.png)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)
[![Installs](https://vsmarketplacebadge.apphb.com/installs/JohnAaronNelson.ForceCode.png)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating/JohnAaronNelson.ForceCode.png)](https://vsmarketplacebadge.apphb.com/rating/JohnAaronNelson.ForceCode.svg)

## Download

I am in the process of getting permission to publish this on the marketplace, but until then you can download
this plugin by finding forcecode-X.X.X.vsix in the top level of this repository, click on it, then click Download.

## Overview

I am continuing development of this extension and make updates to it pretty regularly. The original 
plugin source can be found [here](https://github.com/celador/ForceCode). I have added a ton of extra
functionality, by implementing almost all of the features that the developer console has and a lot of
functionality that surpasses the developer console. This readme is nowhere near complete from what all
I've added to the sourcecode, but I will work on updating it here and there. My main focus has been on
creating functionality, as I use this plugin every day at work.

This extension is a companion for SFDC (Salesforce.com) development with Visual Studio Code.  
It is targeted at developers who want a lightweight and fast way to work with their Salesforce files.  
There's no complicated setup process or project configurations, no external apps to keep open, and no jarring errors knocking you out of your flow.

### Documentation

Documentation site can be found at [https://codescience.com/forcecode/](https://johnaaronnelson.gitbooks.io/forcecode/content/)  

### Permissions

Please note that the following permissions are required to develop on the Force.com platform: [https://developer.salesforce.com/docs/atlas.en-us.pages.meta/pages/pages_intro_permissions.htm](https://developer.salesforce.com/docs/atlas.en-us.pages.meta/pages/pages_intro_permissions.htm)

## Features

* Requires Java 8. Either the JDK or the JRE will work. (For Apex code completion)
    * Windows needs the java path configured in the vscode settings. (Will update with details later)
* Open Classes, Triggers, Visualforce pages, and Visualforce components by right clicking and selecting open
    file in org.
* Open org in the browser. No more need to open a browser and login to salesforce.
* Preview Visualforce pages/Lightning apps.
    * Either right click and select preview or click the icon that appears in the upper right.
* Run Salesforce CLI commands (DX in the menu)
* Task view. See what ForceCode is up to and execute multiple commands at the same time.
* Search in files. Works just like the developer console search in files feature.
* Retrieve code coverage for files in the workspace.
    * This will show up as highlighted lines in the files. If a file in the workspace doesn't have coverage
    after running this command, then the test needs to be run again.
* Retrieve org-wide code coverage. This will show up in a file with all apex classes and their coverage listed.
* Auto comparison of file changes on load/save. Will also show the last person's name that changed the file.
    * Will generate a file named wsMembers.json, DO NOT DELETE THIS FILE OR THIS FEATURE WON'T WORK!!
* NO MORE PASSWORDS SAVED IN THE CONFIG FILE!!!
    * Login through the browser and you will be auto logged in through ForceCode every time until you log out.
* Save / Compile / Deploy a file
  * Works with Classes, Triggers, Components, Pages, Permission Sets, Objects, Custom Labels, and Lightning Components
  * Provides line errors in the editor
  * Works great with autosave
* Run Unit Tests
    * Uses Salesforce DX plugin style links to run tests!!!
    * Code coverage highlighting in the editor
    * Coverage warnings and percents
    * Errors in the editor on test failures
    * Auto-open test log
    * Easy to run a single tests, multiple tests, or all tests in a Class
* Intellisense / Code Completion for Apex/Visualforce/Lightning components
    * For apex code completion, select code completion refresh from the ForceCode menu
* Execute Anonymous
* View / Save Debug Logs
* Open / Retrieve a file
  * Works with Classes, Triggers, Components, Pages, Static Resources, and Lightning Components
  * When opening anything other that Aura files (Lightning components) multiple files can be selected to open
  from the server.
* Deploy Package
    * Replaces need for CumulusCI w/ Ant
    * Retrieve detailed deploy information
    * Runs Validation deploys
* Retrieve Package - three options
    * Retrieve all metadata
    * Retrieve by selecting from available Packages
    * Retrieve by package.xml    
* Bundle & Deploy Static Resources on save
    * Auto refresh the browser on save
    * Works great with autosave
* Create Classes from templates
* Easily switch credentials when working with multiple dev orgs
* Diff server & local versions
* SOQL and Tooling query
    * Quickly run [SOQL Queries](https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql.htm)
    * Query [Tooling Objects](https://developer.salesforce.com/docs/atlas.en-us.api_tooling.meta/api_tooling/reference_objects_list.htm)
    * Results are returned as JSON 
* Arbitrary folder structure
    * Change your project `src` folder
    * Flexible project structure
* API Limit Warnings
* Syntax Highlighting for Visualforce and Apex 
    * Functionality provided by the Visualforce and Apex extensions. 
* ~~Create Package.xml~~ (on hold)
    * Functionality provided by the npm [package-xml](https://www.npmjs.com/package/package-xml) package

## Issues

Please submit any issues or feature requests to [https://github.com/daishi4u/ForceCode/issues](https://github.com/daishi4u/ForceCode/issues)  

## Configuration

To begin, press `Opt+Cmd+C` or open the Command Pallet and type `>ForceCode: Menu` to bring up the ForceCode Menu  
You can then enter your credentials to login to your Salesforce org.  Your configuration file will be stored in the base project directory as `force.json`.  
You need to have a folder opened in VSCode to be able to store this configuration file.
The configuration file should look something like...  

```json
{
    "username": "MonsterMike@Salesforce.com",
    "url": "https://login.salesforce.com",
    "checkForFileChanges": true,
    "autoCompile": true,
    "apiVersion": "38.0",
    "autoRefresh": true,
    "browser": "Google Chrome Canary",
    "debugFilter": 'USER_DEBUG|FATAL_ERROR',
    "debugOnly": true,
    "poll": 1500,
    "pollTimeout": 1200,
    "prefix": "",
    "showTestCoverage": true,
    "showTestLog": false,
    "showFilesOnOpen": true,
    "showFilesOnOpenMax": 3,
    "spaDist": "dist",
    "src": "src",
    "deployOptions": {
      "checkOnly": false,
      "ignoreWarnings": true,
      "rollbackOnError": true,
      "testLevel": "runLocalTests",
      "verbose": true,
    }
}
```

ForceCode will create this file for you upon first start!  


### Options

* username: The username for the org you want to connect to.
* url: This is the login url for Salesforce.  It's either login.salesforce.com for Developer and Professional editions or test.salesforce.com for sandboxes.
* checkForFileChanges: This option, when set to true, will allow ForceCode to check for file changes against the server on startup of ForceCode.
* autoCompile: When a supported file is saved \(works with VSCode's autosave feature\) the file is saved/compiled on the server.  Otherwise, use `cmd + opt + s` to save the file to the server.
* apiVersion: This is the default api version that all your files will be saved with.  If this is not set, this will default to the version of the org in use.  ForceCode will not change the version of an existing file.  This is also the version used for package retrieval and deploy.
* autoRefresh: If autoCompile is on, and you're working in a resource-bundles folder, the staticResource will automatically compile and deploy to your org.  If autoRefresh is on \(and you're working on a Mac\), the currently active tab in Google Chrome Canary \(or your configured browser\) will be refreshed.  This provides a simple browsersync-like experience without the overhead of browsersync
* browser: Define which browser you want to reload when the static resource refreshes \(this only works with Macs at the moment\)
* debugFilter: A regular expression used to match a line for display. The default is to show debug and error lines, so you can filter out the log noise.
* debugOnly: When executing anonymous, we can either show all the output or only the debug lines.  This makes it easier to debug your code.  Turn if on for the important stuff, and turn it off to get all the detail.
* poll: When compiling, this is the interval \(in milliseconds\) at which we poll the server for status updates.  This is only applicable to Classes, Pages, Triggers, and Components.
* pollTimeout: When retrieving packages, or other long running tasks, this is the maximum amount of time \(in seconds\) it will wait before the process times out.  If you're having trouble retrieving your package, try increasing this number.  Default is 600 \(10 minutes\).
* prefix: This is the namespce prefix defined in your package settings for your org.  Set this if you have a namespaced org.  Otherwise ForceCode will attempt to infer a prefix from your Salesforce Org.  If you have a namespaced org and do not set this setting, you may have problems, especially if working on an out of date Org.  This should be automatic as of Salesforce 38
* showTestCoverage: This flag determines if Apex code coverage highlighting should be shown or hidden in the editor.  This can be toggled for the open editor by clicking the colorful icon in the editor bar.
* showTestLog: This flag determines if the Log file for the last test run should show up after the tests are complete.  This is nice for debugging tests.  Use this in conjunction with the other debug flags to keep your output tidy.
* showFilesOnOpen: If set to true, will open files in the editor when opened from Salesforce
* showFilesOnOpenMax: The maximum number of files to open in the editor. More than 3 usually causes problems.
* spaDist: When working with SPAs we usually have a "distribution" folder where we build our files to.  If this string is set, and a SPA is bundled and deployed, this folder will be used as the distribution folder, otherwise the spa project will be deployed.
* src: This is the src folder that contains your project files.  Normally this is not needed, but if you want to have a non-standard folder structure, you can designate an arbitrary folder as your Salesforce metadata directory.
* deployOptions: Deploy your package based on your configured deploy options and the package.xml in your src folder.
  * checkOnly:       Validation only deploy.  Don't actually deploy your code, just make sure it all compiles as a package.  This will generate a `.validationId` file.
  * ignoreWarnings:  Indicates whether a warning should allow a deployment to complete successfully \(true\) or not \(false\).
  * rollbackOnError: Indicates whether any failure causes a complete rollback \(true\) or not \(false\)
  * testLevel:       Specifies which tests are run as part of a deployment Options are: NoTestRun / RunSpecifiedTests / RunLocalTests / RunAllTestsInOrg
  * runTests:        A list of Apex tests to run during deployment \(commma separated list\)
  * verbose:         Output execution detail log to a `DeployStatistics.log` file

There's also one special configuration option that's not included in the force.json, but rather in your vscode settings.json file. This reasoning for separating the files is for portability reasons; to make it easier to share this configuration with others and yourself across projects.  
If you open up your settings.json file, or go to Code &gt; Preferences &gt; Workspace Settings and create a new preference, starting with `force` you should see the filesExclude preference.  
This property allows you to have certain files ignored \(exluded\) from Static Resources when bundled/deployed.  This allows you to create a modern SPA project in a "spa" folder instead of keeping it in your "resource-bundles" directory.  
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

## Commands

ForceCode provides a number of commands to work with your Salesforce org and metadata.

### Compile

Menu: &gt;Force: Save/Deploy/Compile  
Mac: alt + cmd + s  
Win: ctrl + shift + s  
To automatically compile/save your changes to Salesforce when the file is saved locally, you can set the `autoCompile` setting to `true`.  
Otherwise, you will need to use alt + cmd + s to save/compile your file.

#### Get errors as you type

The Auto-compile feature adds a hook to the save command that will automatically deploy and compile your code to your SFDC org whenever you save.  
This works great with VSCode's autosave feature, providing errors as you type.  

Don't worry about waiting while the file is compiling, just keep typing.  
If a compile is in process, ForceCode will queue a compile, so you won't waste API calls and run up your limits compiling on every save.

### Run Apex Unit Tests

Simply click the run tests links in the test class and watch the magic happen!!

### Execute Anonymous

Manu: &gt;Force: Execute Anonymous  
Mac: alt + cmd + e  
Win: ctrl + shift + e  
Simply select the code that you want to run, then right click and select Execute Anonymous!

### Open

Menu: &gt;Force: Get Class, Page, or Trigger  
Mac: alt + cmd + o  
Win: ctrl + shift + o

### Bundle and Deploy Static Resource

Menu: &gt;Force: Save/Deploy/Compile  
Mac: alt + cmd + b  
Win: ctrl + shift + b

ForceCode looks for Static Resources in two places.  The first is `resource-bundles`, the second is `spa`.  Typically, static resources go in the resource-bundles folder, and the resource is named something like `foo.resource` where foo is the name of the static resource.
So, to create a new Static Resource, ensure the resource-bundles folder exists in the root of your project folder.  Then create a new folder named how you want your static resource to be named with `.resource.RESOURCETYPE` at the end of the name(E.G. bootstrap.resource.application.x-zip-compressed).  You can now Bundle and Deploy this Static Resource.
Whenever you save a file that lives in a resource bundles folder, the resource will automatically bundle and deploy to your org.  Use this in conjunction with autoRefresh flag and browser property to get a browsersync-like experience

If you build SPAs, typically you will have a `spa` folder, then another folder named for your static resource, like `spa/foo`.
This folder is your Javascript project, where your package.json lives.
You will build your distribution files to a 'dist' folder or another folder determined by the `spaDist` config property.

SPA folders do not automatically deploy.  We typically run these offline with `jsr-mocks` and webpack and only deploy when we want to publish.

### Deploy Package

Menu: &gt;ForceCode Menu ... Deploy Package

Deploy your package based on your configured deploy options and the package.xml in your src folder.

**Options**:

* checkOnly:       Validation only deploy.  Don't actually deploy your code, just make sure it all compiles as a package.  This will generate a `.validationId` file.
* ignoreWarnings:  Indicates whether a warning should allow a deployment to complete successfully \(true\) or not \(false\).
* rollbackOnError: Indicates whether any failure causes a complete rollback \(true\) or not \(false\)
* runAllTests:     Runn all tests in org
* runTests:        An array of test names to be run [TestClass1, TestClass2,...]
* runTests:        A list of Apex tests to run during deployment \(commma separated list\)
* verbose:         Output execution detail log to a `DeployStatistics.log` file

If you want destructive changes as part of the deploy, put a `destructiveChanges.xml` file in your src folder

Derived from [https://jsforce.github.io/blog/posts/20151106-jsforce-metadata-tools.html](https://jsforce.github.io/blog/posts/20151106-jsforce-metadata-tools.html)

### Retrieve Package

Menu: &gt;ForceCode Menu ... Retrieve Package  
The `apiVersion` setting is used to retrieve your package \(this setting is important in CI setups\) comes directly from your org.  When you want to override your Salesforce org version, set the `apiVersion` setting manually.  This is a string, with the decimal.  
The `pollTimeout` setting is used to determine how long you should wait for the retrieve command to complete.  This should usually take less than a minute, but can take longer with large packages.

### Get Log

Menu: &gt;Force: Get Logs

### Create Class

Menu: &gt;ForceCode Menu ... Create Class  
This will automatically create classes based on `apiVersion` else it defaults to '37.0'.

### ~~Build package.xml~~

Menu: &gt;ForceCode Menu ... Package-xml

Generate a package.xml file in your src directory based on its contents. You can give the package a name, which makes your package easy to retrieve later on, or you can generate a package without a name. You can then use this package.xml to deploy your package.

**SPECIAL NOTE**  
You can create Classes, Triggers, Components, and Pages by simply creating the file anywhere in your project structure.  
When you save it, it'll create the file if it doesn't exist, and update it if it does.  
The manual process doesn't automatically create the meta.xml file, so doesn't work seamlessly with CI.  However there's no easier way to connect to your org, open a file, modify it and save it back to your org.  This means working with multiple orgs is easier than ever.


## Help Develop ForceCode 

### Clone the repo

Step 1.  Clone this repo to your local machine, like you would with any other Git repository.

### Open the folder

Step 2.  Open the folder you just created when you cloned the repo in VSCode.

### Install the dependencies

Step 3.  Open the terminal by pressing `ctrl` + `~` and install the dependencies by running `npm install`
        After everything is installed read the Readme file in the needscopied file and place the files in that
        folder where they need to be, replacing the existing files.

### Run the extension

Step 4.  Press F5 to start debugging the extension. Another VSCode window will open up, which will host your extension.  Open your Salesforce project and start working.
         If you get an error, ensure you have Typescript installed globally `npm install typescript -g`

### Debug the extension

Step 5.  Find the file for the command you want to run and debug, and put in a breakpoint. Run the command to hit the breakpoint and start exploring the variables.  

Step 6.  Have Fun!


## Future goals

* Use the Salesforce CLI way of creating files instead of templates.
* Add snippets, such as documentation snippets
* Lots more, when I think of it.

## Change Log

* 3.5.5
    * Added a new code coverage view for 'No Coverage Data' What this means is that the class has been updated without running the test class after updating. When you do this, it removes the coverage data so 0% wasn't an accurate category, therefore we needed a new one.
    * Code covereage is updated upon opening a file (From the Salesforce org) or refreshing a file
    * Underhood changes to improve memory consumption
* 3.5.4
    * Fix a startup bug (Invalid type:null)
* 3.5.3
    * Fix fresh project startup and login bugs. 
    * Add notification when an apex test passes.
    * Fix typo in execute anonymous menu item.
    * Update code coverage view wording into Sufficient and Insufficient Coverage.
    * Show connected username as tooltip on user status bar item (ForceCode x.x.x connected....)
    * Only show the log if there is info to show. So it's not a bug when the logfile doesn't show, it just means there's no debug data to show because it was all filtered out by the debug level you have it set to in the force.json file (e.g. "debugFilter": 'USER_DEBUG|FATAL_ERROR',)
* 3.5.2
    * Fix startup issue 'Cannot read property then of undefined'
* 3.5.1
    * Fix login/out bug.
    * Fix classes with coverage being out of order.
    * Startup bug fixed(???) - Let me know of any issues with this.
* 3.5.0
    * Add test coverage view in the ForceCode view. This will show Covered/Uncovered/Test classes and will get the covereage upon start. Also got rid of menu item to fetch the coverage for the files in the source folder as this will be no longer needed.
* 3.4.0
    * Add new view for ForceCode (Shows on the left bar) and new StatusBarItem that shows the number of running tasks. If you click on the running tasks status bar item it will take you to the ForceCode view. The ForceCode view will also be used in the future to show Salesforce and ForceCode related items.
* 3.3.3
    * Check for file changes now includes lastModifiedById as a safety precaution (YOU MUST DELETE THE wsMembers.json FILE BEFORE STARTING VSCODE AFTER THIS UPDATE!!!!!!)
* 3.3.2
    * Added option to config file to turn off checking for file changes on start.
    * Increased max time difference for file change check to 10 seconds (To resolve issues with false positives on file changes)
* 3.3.1
    * Add new Aura file types
* 3.3.0
    * Fixed login issues (And hopefully others with this release)
* 3.2.9
    * Fixed bug with being able to 'preview' visualforce components
* 3.2.8
    * Added right-click to open files in Salesforce org
* 3.2.7
    * Added preview command for Visualforce pages/Lightning apps
