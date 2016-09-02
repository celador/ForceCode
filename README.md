# ForceCode for Visual Studio Code

This extension is a companion for SFDC development with Visual Studio Code.
It is targeted at developers who want a lightweight and fast way to work with their Salesforce files.
There's no complicated setup process or project configurations, no external apps to keep open, and no jarring errors knocking you out of your flow.

To get syntax highlighting, make sure you install the Visualforce and Apex extensions.

## Issues

Please submit any issues to <https://github.com/celador/ForceCode/issues>
I use this extension every day, so if there is something not working, I would appreciate it if you explained your error so I can fix it.
I will try to be as responsive as possible to reported issues.

## Features

* Execute Anonymous
* View Debug Logs
* Open / Retrieve a file
* Save / Compile / Deploy a file
  * Works with Classes, Triggers, Components, Pages, and Lightning Components
  * Provides line errors in the editor
* Retrieve Package
* Bundle & Deploy Static Resource
* Create Classes from templates
* ~~Deploy Package~~

## Configuration

To begin, press `Opt+Cmd+C` or open the Command Pallet and type `>ForceCode: Menu` to bring up the ForceCode Menu
You can then enter your credentials to login to your Salesforce org.  Your configuration file will be stored in the base project directory as `force.json`.
The configuration file should look something like...

``` json
{
    "username": "MonsterMike@Salesforce.com",
    "password": "YourPasswordHere",
    "autoCompile": true,
    "url": "https://test.salesforce.com",
    "pollTimeout": 120,
    "debugOnly": false,
    "apiVersion": "37.0",
}
```

**Special Note**
VSCode recently started the bad habit of closing the text inputs when the app loses focus.
This has caused some people to have trouble logging in because they have can't copy/paste their credentials.
In that case, create the `force.json` file in the root of your currently opened project folder and copy the configuration from above.
In the future, to ameliorate the current situation, I will persist this configuration file after every input, so copy/paste will be a bit easier.

## Get errors as you type

The Auto-compile feature adds a hook to the save command that will automatically deploy and compile your code to your SFDC org whenever you save.
This works great with VSCode's autosave feature, providing errors as you type.

## Commands

ForceCode provides a number of commands to work with your Salesforce org and metadata.

### Execute Anonymous

\>Force: Execute Anonymous
Keyboard: alt + cmd + e
To only show the User Debug lines, you can set the `debugOnly` setting to `true`

### Compile

\>Force: Save/Deploy/Compile
Keyboard: alt + cmd + s
To automatically compile/save your changes to Salesforce when the file is saved locally, you can set the `autoCompile` setting to `true`.
Otherwise, you will need to use alt + cmd + s to save/compile your file.

### Open

\>Force: Get Class, Page, or Trigger
Keyboard: alt + cmd + o

### Bundle and Deploy Static Resource

\>Force: Save/Deploy/Compile
Keyboard: alt + cmd + b

### Retrieve Package

\>Force: Retrieve Package
The `apiVersion` setting is used to retrieve your package (this setting is important in CI setups) comes directly from your org.  When you want to override your Salesforce org version, set the `apiVersion` setting manually.  This is a string, with the decimal.
The `pollTimeout` setting is used to determine how long you should wait for the retrieve command to complete.  This should usually take less than a minute, but can take longer with large packages.

### Get Log

\>Force: Get Logs

### Create Class

\>ForceCode Menu -> Create Class
This will automatically create classes based on `apiVersion` else it defaults to '37.0'.

**SPECIAL NOTE**  You can create Classes, Triggers, Components, and Pages by simply creating the file anywhere in your project structure.
When you save it, it'll create the file if it doesn't exist, and update it if it does.
The manual process doesn't automatically create the meta.xml file, so doesn't work seamlessly with CI, but if all you want to do is open a file, modify it and save it, there's no easier way than with this extension.

## Future goals

* Test runner
* Intellisense code completion
* Debug Apex code with breakpoints in the editor
* Integrate with Yo Force to provide scaffolding of files.
