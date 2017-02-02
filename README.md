# ForceCode for Visual Studio Code

[![Version](http://vsmarketplacebadge.apphb.com/version/JohnAaronNelson.ForceCode.svg)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)  
[![Installs](http://vsmarketplacebadge.apphb.com/installs/JohnAaronNelson.ForceCode.svg)](https://marketplace.visualstudio.com/items?itemName=JohnAaronNelson.ForceCode)  
[![Ratings](https://vsmarketplacebadge.apphb.com/rating/JohnAaronNelson.ForceCode.svg)](https://vsmarketplacebadge.apphb.com/rating/JohnAaronNelson.ForceCode.svg)

This extension is a companion for SFDC development with Visual Studio Code.  
It is targeted at developers who want a lightweight and fast way to work with their Salesforce files.  
There's no complicated setup process or project configurations, no external apps to keep open, and no jarring errors knocking you out of your flow.

To get syntax highlighting, make sure you install the Visualforce and Apex extensions.

## Documentation

Documentation can be found at [https://johnaaronnelson.gitbooks.io/forcecode/content/](https://johnaaronnelson.gitbooks.io/forcecode/content/)  
Documentation modifications are done in the Documentation branch.  (This is a test)

## Issues

Please submit any issues to [https://github.com/celador/ForceCode/issues](https://github.com/celador/ForceCode/issues)  
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

```json
{
    "username": "MonsterMike@Salesforce.com",
    "password": "YourPasswordHere",
    "url": "https://login.salesforce.com",
    "autoCompile": true,
    "autoRefresh": true,
    "browser": "Google Chrome Canary",
    "poll": 1500,
    "pollTimeout": 1200,
    "debugOnly": true,
    "apiVersion": "38.0",
    "prefix": "",
    "src": "src",
    "deployOptions": {
      "checkOnly": false,
      "testLevel": "runLocalTests",
      "verbose": false,
      "ignoreWarnings": true
    }
}
```

It's probably best to go ahead and create your config file `force.json` in the root of your workspace.  Copy the below configuration and fill in the values.  
Note: the password is in the format "passwordtoken".  Do not try to use any delimiters.

### Options

* username: The username for the org you want to connect to.
* password: The password, with security token, for your user.
* url: This is the login url for Salesforce.  It's either login.salesforce.com for Developer and Professional editions or test.salesforce.com for sandboxes.
* autoCompile: When a supported file is saved \(works with VSCode's autosave feature\) the file is saved/compiled on the server.  Otherwise, use `cmd + opt + s` to save the file to the server.
* autoRefresh: If autoCompile is on, and you're working in a resource-bundles folder, the staticResource will automatically compile and deploy to your org.  If autoRefresh is on \(and you're working on a Mac\), the currently active tab in Google Chrome Canary \(or your configured browser\) will be refreshed.  This provides a simple browsersync-like experience without the overhead of browsersync
* browser: Define which browser you want to reload when the static resource refreshes \(this only works with Macs at the moment\)
* poll: When compiling, this is the interval \(in milliseconds\) at which we poll the server for status updates.  This is only applicable to Classes, Pages, Triggers, and Components.
* pollTimeout: When retrieving packages, or other long running tasks, this is the maximum amount of time \(in seconds\) it will wait before the process times out.  If you're having trouble retrieving your package, try increasing this number.  Default is 600 \(10 minutes\).
* debugOnly: When executing anonymous, we can either show all the output or only the debug lines.  This makes it easier to debug your code.  Turn if on for the important stuff, and turn it off to get all the detail.
* apiVersion: This is the default api version that all your files will be saved with.  If this is not set, this will default to the version of the org in use.  ForceCode will not change the version of an existing file.  This is also the version used for package retrieval and deploy.
* prefix: This is the namespce prefix defined in your package settings for your org.  Set this if you have a namespaced org.  Otherwise ForceCode will attempt to infer a prefix from your Salesforce Org.  If you have a namespaced org and do not set this setting, you may have problems, especially if working on an out of date Org.  This should be automatic as of Salesforce 38
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

### Run Apex Unit Tests

Menu: &gt;ForceCode Menu... Run Unit Tests  
Mac: alt + cmd + t  
Win: ctrl + shift + t  
Run the tests in the currently open file.  
For easy and fun TDD, keep the class you're working on open in one pane, and your tests in the other.  
AutoCompile means you The tests will execute and output the results below.

### Execute Anonymous

Manu: &gt;Force: Execute Anonymous  
Mac: alt + cmd + e  
Win: ctrl + shift + e  
Open any file, untitled or otherwise, and use the key combo to run the code and get back the results in the output pane. I usually name my file something like anonymous.apex  
I've also applied the .apex extension to the Apex languge syntax.  Doing this allows you to more easily differentiate between your anonymous scratch files and actual apex classes.  
To only show the User Debug lines, you can set the `debugOnly` setting to `true`

### Open

Menu: &gt;Force: Get Class, Page, or Trigger  
Mac: alt + cmd + o  
Win: ctrl + shift + o

### Bundle and Deploy Static Resource

Menu: &gt;Force: Save/Deploy/Compile  
Mac: alt + cmd + b  
Win: ctrl + shift + b

### Build package.xml

Menu: &gt;ForceCode Menu ... Package-xml

Generate a package.xml file in your src directory based on its contents. You can give the package a name, which makes your package easy to retrieve later on, or you can generate a package without a name. You can then use this package.xml to deploy your package.

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

**SPECIAL NOTE**  
You can create Classes, Triggers, Components, and Pages by simply creating the file anywhere in your project structure.  
When you save it, it'll create the file if it doesn't exist, and update it if it does.  
The manual process doesn't automatically create the meta.xml file, so doesn't work seamlessly with CI.  However there's no easier way to connect to your org, open a file, modify it and save it back to your org.  This means working with multiple orgs is easier than ever.

## Future goals

* Test runner \(kind of done\)

* Intellisense code completion

* Debug Apex code with breakpoints in the editor

* Integrate with Yo Force to provide scaffolding of files.
