[![Logo](https://raw.githubusercontent.com/celador/ForceCode/master/images/logo-type.png)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)

# ForceCode for Visual Studio Code

These will eventually be replaced. They are based on the original extension.
[![Version](https://vsmarketplacebadge.apphb.com/version/JohnAaronNelson.ForceCode.png)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)
[![Installs](https://vsmarketplacebadge.apphb.com/installs/JohnAaronNelson.ForceCode.png)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating/JohnAaronNelson.ForceCode.png)](https://vsmarketplacebadge.apphb.com/rating/JohnAaronNelson.ForceCode.svg)

## IMPORTANT INFORMATION

The extension has changed tremendously between versions 3.7.1 and 3.8.0. Please read the below information for changes before submitting an issue because you think something doesn't work! The contents of this README have changed quite a bit, so pay attention. Before we get into details, if you're wanting to upgrade to 3.8.0 then there are a few things you need to do to "convert" the project:

First or all, you don't need the wsMembers.json file anymore! ForceCode now uses file last modified dates to compare for changes!

1. Create a new project in an empty folder logging into the org who's project you want to convert. First thing you will notice is you don't need to input a username into ForceCode, this is because it will grab it from the result of logging in through the browser.
2. Once the project is made, you can edit your force.json if you'd like to define a seperate directory for each org (Or, you can use a single src directory for all orgs, this makes transfering files between orgs super easy!). Take a look at the example config further down the page on how to set this up. DON'T TOUCH the username or src options (The "old forcecode" options) as they will change automatically each time you switch orgs. This is to keep your place for when you start ForceCode again. You can define the srcDefault option if you want orgs that aren't included in the srcs option to all use a certain folder (otherwise they will all use the "src" folder).
3. Open the old and new projects in a file explorer and copy (or cut) everything out of your src folder and paste it into the new project's src folder for that org. 
4. The "resource-bundle" folder (If applicable) needs to be copied into the new project's src folder (NOT THE ROOT LIKE THE OLD PROJECT). Any SOQL, TOQL, or coverage folders can be copied into the src file as well (If desired).
5. If you don't mind refreshing sObjects for code completion over again for each org then you are done. Skip this step and read on. If you don't want to refresh your code completion sobjects then go back to the project root of each project (the folder containing the force.json) and copy the .sfdx from the old project into the .forceCode/(USERNAME HERE)/.sfdx folder. You're all set now, read on for more info!

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

### Permissions

Please note that the following permissions are required to develop on the Force.com platform: [https://developer.salesforce.com/docs/atlas.en-us.pages.meta/pages/pages_intro_permissions.htm](https://developer.salesforce.com/docs/atlas.en-us.pages.meta/pages/pages_intro_permissions.htm)

## Features

* For code completion and highlighting I highly reccomend downloading the various Salesforce language server extensions.
    * For apex code completion, select code completion refresh from the ForceCode menu and it will work with the Salesforce apex language server extension. You will need to refresh for each org. ForceCode handles the rest and switches code completion files when switching orgs/usernames.
* Edit and save almost everything in Salesforce textually (Workflows, classes, lead assignment rules, etc..)
    * Now works with the autoCompile option. Save the file and Salesforce will send it to the org (If this option is on).
* Right click on a file in the explorer to save.
* Right click on a file or folder to refresh from the server.
* Multiple org support. Log into each org through ForceCode and you won't need to log out to switch orgs, simply click on another org in the "Saved Usernames" view and ForceCode will log you in.
* Open Classes, Triggers, Visualforce pages, and Visualforce components by right clicking and selecting open
    file in org.
* Open org in the browser. No more need to open a browser and login to salesforce.
* Preview Visualforce pages/Lightning apps.
    * Either right click and select preview or click the icon that appears in the upper right.
* Run Salesforce CLI commands (DX in the menu)
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
    * Highlight text, then right click and select "Execute Anonymous"
* View / Save Debug Logs (Use the menu item to get debug logs to save)
* Open / Retrieve a file
  * Works with Classes, Triggers, Components, Pages, Static Resources, and Lightning Components
  * Multiple files can be selected to open from the server.
* Deploy Package
    * Replaces need for CumulusCI w/ Ant
    * Retrieve detailed deploy information
* Retrieve Package - three options
    * Retrieve all metadata
    * Retrieve by selecting from available Packages
    * Retrieve by package.xml    
* Bundle & Deploy Static Resources on save
    * Auto refresh the browser on save (Mac only)
    * Works great with autosave
* Create Classes from templates
* Diff server & local versions
* SOQL and Tooling query
    * Quickly run [SOQL Queries](https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql.htm)
    * Query [Tooling Objects](https://developer.salesforce.com/docs/atlas.en-us.api_tooling.meta/api_tooling/reference_objects_list.htm)
    * Results are returned as JSON 
* Arbitrary folder structure
    * Change your project `src` folder
    * Flexible project structure
* API Limit Warnings (Now a hover, when you hover over usernames in the Saved Usernames view (This also shows the project's path))

## Issues

Please submit any issues or feature requests to [https://github.com/daishi4u/ForceCode/issues](https://github.com/daishi4u/ForceCode/issues)  

## Configuration

To begin, press `Opt+Cmd+C` or open the Command Pallet and type `>ForceCode: Menu` to bring up the ForceCode Menu  
You can then select if you want to log into a production org or test org. A browser will then open to the Salesforce login where you can enter your credentials. A configuration file will then be auto generated for you in your current open project folder in vscode called `force.json`.  
You need to have a folder opened in VSCode to be able to store this configuration file.
The configuration file should look something like... (THIS IS AN EXAMPLE WITH EVERY POSSIBLE OPTION, THE DEFAULT DOESN'T QUITE LOOK LIKE THIS)

```json
{
    "apiVersion": "43.0",
    "autoCompile": true,
    "autoRefresh": true,
    "browser": "Google Chrome Canary",
    "checkForFileChanges": true,
    "debugFilter": "USER_DEBUG|FATAL_ERROR",
    "debugOnly": true,
    "deployOptions": {
      "checkOnly": false,
      "ignoreWarnings": true,
      "rollbackOnError": true,
      "testLevel": "runLocalTests",
    },
    "overwritePackageXML": false,
    "poll": 1500,
    "pollTimeout": 1200,
    "prefix": "",
    "revealTestedClass": false,
    "showFilesOnOpen": true,
    "showFilesOnOpenMax": 3,
    "showTestCoverage": true,
    "showTestLog": false,
    "spaDist": "dist",
    "src": "src",
    "srcDefault": "src",
    "srcs": {
        "MonsterMikeTest@Salesforce.com": {
            "src": "another/folder",
            "url": "https://test.salesforce.com"
        },
        "MonsterMike@Salesforce.com": {
            "src": "src",
            "url": "https://login.salesforce.com"
        }
    },
    "username": "MonsterMike@Salesforce.com",
    "url": "https://login.salesforce.com"    
}
``` 


### Options

* apiVersion: This is the default api version that all your files will be saved with.  If this is not set, this will default to the version of the org in use.  ForceCode will not change the version of an existing file.  This is also the version used for package retrieval and deploy.
* autoCompile: When a supported file is saved \(works with VSCode's autosave feature\) the file is saved/compiled on the server.  Otherwise, use `cmd + opt + s` to save the file to the server.
* autoRefresh: If autoCompile is on, and you're working in a resource-bundles folder, the staticResource will automatically compile and deploy to your org.  If autoRefresh is on \(and you're working on a Mac\), the currently active tab in Google Chrome Canary \(or your configured browser\) will be refreshed.  This provides a simple browsersync-like experience without the overhead of browsersync
* browser: Define which browser you want to reload when the static resource refreshes \(this only works with Macs at the moment\)
* checkForFileChanges: This option, when set to true, will allow ForceCode to check for file changes against the server on startup of ForceCode.
* debugFilter: A regular expression used to match a line for display. The default is to show debug and error lines, so you can filter out the log noise.
* debugOnly: When executing anonymous, we can either show all the output or only the debug lines.  This makes it easier to debug your code.  Turn if on for the important stuff, and turn it off to get all the detail.
* deployOptions: Deploy your package based on your configured deploy options and the package.xml in your src folder.
  * checkOnly:       Validation only deploy.  Don't actually deploy your code, just make sure it all compiles as a package.  This will generate a `.validationId` file.
  * ignoreWarnings:  Indicates whether a warning should allow a deployment to complete successfully \(true\) or not \(false\).
  * rollbackOnError: Indicates whether any failure causes a complete rollback \(true\) or not \(false\)
  * testLevel:       Specifies which tests are run as part of a deployment Options are: NoTestRun / RunSpecifiedTests / RunLocalTests / RunAllTestsInOrg
  * runTests:        A list of Apex tests to run during deployment \(commma separated list\)
* overwritePackageXML: if set to true, will overwrite package.xml file upon opening or retrieving files
* poll: When compiling, this is the interval \(in milliseconds\) at which we poll the server for status updates.  This is only applicable to Classes, Pages, Triggers, and Components.
* pollTimeout: When retrieving packages, or other long running tasks, this is the maximum amount of time \(in seconds\) it will wait before the process times out.  If you're having trouble retrieving your package, try increasing this number.  Default is 600 \(10 minutes\).
* prefix: This is the namespce prefix defined in your package settings for your org.  Set this if you have a namespaced org.  Otherwise ForceCode will attempt to infer a prefix from your Salesforce Org.  If you have a namespaced org and do not set this setting, you may have problems, especially if working on an out of date Org.  This should be automatic as of Salesforce 38
* revealTestedClass: When set to true, this will reveal the class (In the code coverage view) that received the highest amount of coverage from running a test. I say this because if you don't have the tested class in your src folder then it will show the next highest covered class in your project. If none are found then it won't be revealed.
* showFilesOnOpen: If set to true, will open files in the editor when opened from Salesforce
* showFilesOnOpenMax: The maximum number of files to open in the editor. More than 3 usually causes problems or doesn't work.
* showTestCoverage: This flag determines if Apex code coverage highlighting should be shown or hidden in the editor.  This can be toggled for the open editor by clicking the colorful icon in the editor bar.
* showTestLog: This flag determines if the Log file for the last test run should show up after the tests are complete.  This is nice for debugging tests.  Use this in conjunction with the other debug flags to keep your output tidy. The log file will only show if it's not empty (Because of filtering).
* spaDist: When working with SPAs we usually have a "distribution" folder where we build our files to.  If this string is set, and a SPA is bundled and deployed, this folder will be used as the distribution folder, otherwise the spa project will be deployed.
* src: DO NOT TOUCH THIS, IT'S SO THAT FORCECODE CAN LOG INTO THE LAST ORG YOU USED
* srcDefault: This acts like the old src option did, basically if you have this defined then any org not in the next option (srcs) will default to saving in this location.
* srcs: This allows you to define a seperate location for each org to store the files. The format is as follows:
  * "myusername@bob.com" {                      // The username for this org
      "src": "my/src/folder",                   // The relative folder location you want files stored to
      "url": "https://test.salesforce.com"      // The login url for the org (test or login)
  }
* username: DO NOT TOUCH THIS, IT'S SO THAT FORCECODE CAN LOG INTO THE LAST ORG YOU USED
* url: DO NOT TOUCH THIS, IT'S SO THAT FORCECODE CAN LOG INTO THE LAST ORG YOU USED


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

To get code completion and errors as you type you will need to install the Salesforce language server extensions for Apex, Visualforce, and Lightning. Forcecode will create sObjects for use with the Apex extension for code completion (smartness as they call it now)

### Run Apex Unit Tests

Simply hover over an @isTest or testMethod and you will see a ForceCode hover appear. Follow the instructions given and wath the magic happen!!

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

Deploy your package based on your configured deploy options and the package.xml in your src folder.

**Options**:

* checkOnly:       Validation only deploy.  Don't actually deploy your code, just make sure it all compiles as a package.  This will generate a `.validationId` file.
* ignoreWarnings:  Indicates whether a warning should allow a deployment to complete successfully \(true\) or not \(false\).
* rollbackOnError: Indicates whether any failure causes a complete rollback \(true\) or not \(false\)
* runAllTests:     Runn all tests in org
* runTests:        An array of test names to be run [TestClass1, TestClass2,...]

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
This will automatically create classes based on `apiVersion` else it defaults to '43.0'.

**SPECIAL NOTE**  
You can create Classes, Triggers, Components, and Pages by simply creating the file anywhere in your project structure.  
When you save it, it'll create the file if it doesn't exist, and update it if it does.  
The manual process doesn't automatically create the meta.xml file, so doesn't work seamlessly with CI.  However there's no easier way to connect to your org, open a file, modify it and save it back to your org.  This means working with multiple orgs is easier than ever.

### Open org

Open the org in a browser. No more logging in!!

### Find

This works just like the "Search Files" feature in the developer console.

### Get overall org test coverage

Use this option and ForceCode will create a list of all apex classes and their coverage at the time of retrieval. It will also include an estimated overall coverage percentage (This is calculated by adding up all the other data (covered lines/total lines))

### Code Completion Refresh

This will grab all sObject data from Salesforce and allow you to use this extension with the Salesforce Apex language extension for code smartness. Make sure you set up the Apex extension correctly by following the instructions [here](https://marketplace.visualstudio.com/items?itemName=salesforce.salesforcedx-vscode-apex)


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


## Change Log

* 3.8.3
    * Right click on any file to save to the org (Or simply save the file if autoCompile is on and if the file is valid (In the current org src folder and a valid type))
        * Works with almost any type of file from the org (Workflow rules, assignment rules, etc)
        * Only one file can be saved at a time, THIS HASN'T CHANGED!!
    * Refresh files from the explorer context menu by right clicking on a file or folder (Refreshing a folder will retrieve all of that type of a whole Lightning component bundle)
        * Multiple files can be selected for refreshing
    * Optimization in the way ForceCode retrieves files. Before this version, code coverage and metadata would be retrieved each time any type of file was opened. Now it's only retrieved if it's needed (E.G. code coverage data is only retrieved when a class or trigger file has been retrieved instead of all of the time).
* 3.8.2
    * Fixed bugs on Windows where files weren't being removed from the code coverage view when they were deleted
    * Fix error not being shown for lightning components when there's a syntax error on creation or the file naming convention is wrong
    * Fix bug with lightning components always saying they've been changed on the server even if they haven't
* 3.8.1
    * Fix bug on windows with files not getting added to code coverage view on refresh or open
    * Fix ForceCode throwing error when editing force.json
    * Fix refreshing aura components (From the ForceCode: Refresh from server command)
* 3.8.0
    * Multiple-org support. There are a lot of changes here, but the biggest is being able to switch to another org by clicking the username in the "Saved Usernames" view.
    * Project folder structure overhauled to allow for multiple orgs
    * Fixed deploying packages based on a package.xml
    * wsMembers.json is no longer needed. ForceCode uses files last modified date for comparison with the server now
    * If access (or refresh) token becomes expired, handle it better by asking the user to log in again
    * Many changes to the force.json file. Starting ForceCode should still work with the "old" force.json files
    * User status bar removed. Limit information is now a hover when you hover over your usernames in the "Saved Usernames" view along with the path that files are saved in for each org. Try it, it's awesome!!
    * Added option for revealing the class with the highest coverage as a result from running an apex test (set revealTestedClass to true in force.json to enable)
    * Pretty icons for the Code Coverage view and for the Saved usernames view
    * Added a section in the Code Coverage view for classes not in the current org. This will make it easy to see what files you shouldn't touch or that you're in the process of copying from one org to another
    * Fixed showing files on open
    * Fixed an error when compiling a class
    * Added more error messages for things such as creating a class in ForceCode with syntax errors and trying to deploy
    * Added an error if a user tried to save a file that isn't in the current org
* 3.7.1
    * Add option (overwritePackageXML) to force.json to control overwriting package.xml. Set it to true to overwrite or false to not.
    * Fix 'running an entire test class throws error' issue
    * Fix 'ForceCode 3.7.0 Changed file notifications never go away' issue
* 3.7.0
    * handleMetaFiles option removed. Handling metafiles is now required because of the new way I have implemented opening files (Especially static resources)
    * Errors only reported in problems panel now for apex files, no more notifications
    * Open aura files from salesforce open file menu, even multiple ones.
    * FOR NOW, files no longer open in  the editor when retrieving from the org. Can fix in the future.
    * Opening a large number of files should use less limits now because I use the 'retrieve' way of opening now.
* 3.6.6
    * Don't depend on Salesforce extensions for activation anymore, but if you have them then code completion will still work. This makes ForceCode start a LOT faster.
    * Saving meta.xml files now works (Only for classes, triggers, pages, components, and lightning components)
        * You will only get meta.xml files when handleMetaFiles is set to true in force.json
* 3.6.5
    * Fix spaDist way of uploading SPA static resources
* 3.6.4
    * Fix retrieve getting stuck and a few other errors with it. Retrieving by package.xml works now too.
* 3.6.3
    * Fix duplicate error messages from ForceCode in problems panel
    * Don't show notification for every error in Apex, instead tell them to look at the problems panel
* 3.6.2
    * Test methods can now be ran by hovering over @isTest and testMethod, then clicking the link that it gives in the hover to run the test! Sorry for the changes, but this is the way tests will be run from now on.
    * Fix saving lightning component parts (basically any part(javascript, css, etc..) that wasn't the component itself)
* 3.6.1
    * Fix ForceCode execution of apex test classes since v43.11.0 of the Salesforce extensions broke it. Now, in order to run apex test with forcecode you need to CTRL + click on @isTest or testMethod! Clicking on Run tests will throw an erro without the CLI installed so I had to make my own, enjoy!!
* 3.6.0
    * Not a huge release, just added checking for file changes with Lightning components (Aura). This feature only checks when you save a component file and doesn't check on start, because I can't query the proper object without using a lot of queries. So, for now this is the way it will work.