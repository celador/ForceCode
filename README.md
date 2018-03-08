[![Logo](https://raw.githubusercontent.com/celador/ForceCode/master/images/logo-type.png)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)

# ForceCode for Visual Studio Code

[![Version](https://vsmarketplacebadge.apphb.com/version/JohnAaronNelson.ForceCode.png)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)
[![Installs](https://vsmarketplacebadge.apphb.com/installs/JohnAaronNelson.ForceCode.png)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating/JohnAaronNelson.ForceCode.png)](https://vsmarketplacebadge.apphb.com/rating/JohnAaronNelson.ForceCode.svg)

## Deprecation

This extension has been deprecated in favor of [Salesforce DX](https://marketplace.visualstudio.com/items?itemName=salesforce.salesforcedx-vscode) 

This extension will no longer receive any updates.  You may continue to use this extension for as long as you want.  

If you would like to see this project continue, please let me know.

## Overview

This extension is a companion for SFDC (Salesforce.com) development with Visual Studio Code.  
It is targeted at developers who want a lightweight and fast way to work with their Salesforce files.  
There's no complicated setup process or project configurations, no external apps to keep open, and no jarring errors knocking you out of your flow.

### Documentation

Documentation site can be found at [https://codescience.com/forcecode/](https://johnaaronnelson.gitbooks.io/forcecode/content/)  

### Permissions

Please note that the following permissions are required to develop on the Force.com platform: [https://developer.salesforce.com/docs/atlas.en-us.pages.meta/pages/pages_intro_permissions.htm](https://developer.salesforce.com/docs/atlas.en-us.pages.meta/pages/pages_intro_permissions.htm)

## Features

* Save / Compile / Deploy a file
  * Works with Classes, Triggers, Components, Pages, Permission Sets, Objects, Custom Labels, and Lightning Components
  * Provides line errors in the editor
  * Works great with autosave
* Run Unit Tests
    * Code coverage highlighting in the editor
    * Coverage warnings and percents
    * Errors in the editor on test failures
    * Auto-open test log
    * Easy to run a single tests, multiple tests, or all tests in a Class
* Intellisense / Code Completion for Apex (in progress)
* Execute Anonymous
* View / Save Debug Logs
* Open / Retrieve a file
  * Works with Classes, Triggers, Components, Pages, Static Resources, and Lightning Components
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

Please submit any issues or feature requests to [https://github.com/celador/ForceCode/issues](https://github.com/celador/ForceCode/issues)  

## Configuration

To begin, press `Opt+Cmd+C` or open the Command Pallet and type `>ForceCode: Menu` to bring up the ForceCode Menu  
You can then enter your credentials to login to your Salesforce org.  Your configuration file will be stored in the base project directory as `force.json`.  
You need to have a folder opened in VSCode to be able to store this configuration file.
The configuration file should look something like...  

```json
{
    "username": "MonsterMike@Salesforce.com",
    "password": "YourPasswordHere",
    "url": "https://login.salesforce.com",
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

It's probably best to go ahead and create your config file `force.json` in the root of your workspace.  Copy the above configuration and fill in the values.  
Note: the password is in the format "passwordtoken".  Do not try to use any delimiters.

### Options

* username: The username for the org you want to connect to.
* password: The password, with security token, for your user.
* url: This is the login url for Salesforce.  It's either login.salesforce.com for Developer and Professional editions or test.salesforce.com for sandboxes.
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

Menu: &gt;ForceCode Menu... Run Unit Tests  
Mac: alt + cmd + t  
Win: ctrl + shift + t  
Run tests in the currently open file.  

You can run all tests in the current file or any individual tests in the current file.
To run all tests in the current file, make sure you have no text selected and use the hotkey.
If you have any text selected that contains a corresponding test method name, it will run only those tests.  So, to run a single test, simply highlight the method name and execute the "Run Apex Tests" command

For easy and fun TDD, keep the class you're working on open in one pane, and your tests in the other.
Use the keyboard shortcut and the tests will execute.  The results of your tests will display below, along with errors.
Code coverage will also be generated and display in your Class file.

### Execute Anonymous

Manu: &gt;Force: Execute Anonymous  
Mac: alt + cmd + e  
Win: ctrl + shift + e  
Open any file, untitled or otherwise, and use the key combo to run the code and get back the results in the output pane. I usually name my file something like anonymous.apex and put it in a .apex folder in my root, and add that folder to my .gitignore, retaining all your scratch code in nice, tidy. and safe way.
I've applied the .apex extension to the Apex languge syntax. I also typically create a `.apex` directory in my project where I store these scratch files. 
Doing this allows you to more easily differentiate between your anonymous scratch files and actual apex classes, but you get syntax highlighting and code completion and do not deploy the code by mistake.  
To only show the User Debug lines, you can set the `debugOnly` setting to `true`.  

Also, take note of the debugFilter property.  This is where you can set a regular expression filter to use with the debugOnly flag, removing all the noise from debugging.

### Open

Menu: &gt;Force: Get Class, Page, or Trigger  
Mac: alt + cmd + o  
Win: ctrl + shift + o

### Bundle and Deploy Static Resource

Menu: &gt;Force: Save/Deploy/Compile  
Mac: alt + cmd + b  
Win: ctrl + shift + b

ForceCode looks for Static Resources in two places.  The first is `resource-bundles`, the second is `spa`.  Typically, static resources go in the resource-bundles folder, and the resource is named something like `foo.resource` where foo is the name of the static resource.
So, to create a new Static Resource, ensure the resource-bundles folder exists in the root of your project folder.  Then create a new folder named how you want your static resource to be named with `.resource` at the end of the name.  You can now Bundle and Deploy this Static Resource.
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
* testLevel:       Specifies which tests are run as part of a deployment Options are: NoTestRun / RunSpecifiedTests / RunLocalTests / RunAllTestsInOrg
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

### Run the extension

Step 4.  Press F5 to start debugging the extension. Another VSCode window will open up, which will host your extension.  Open your Salesforce project and start working.
         If you get an error, ensure you have Typescript installed globally `npm install typescript -g`

### Debug the extension

Step 5.  Find the file for the command you want to run and debug, and put in a breakpoint. Run the command to hit the breakpoint and start exploring the variables.  

Step 6.  Have Fun!


## Future goals

* Intellisense code completion (in progress)
* Implement checkpoints in the editor

## Change Log

* 0.5.23 
  - Reorder "Create Class" command options to make Custom the default option
  - Change "Get Logs" behavior to not create an "untitled" log file
