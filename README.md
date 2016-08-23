# ForceCode for Visual Studio Code
This extension is a companion for SFDC development with Visual Studio Code. 

##Issues
Please submit any issues to https://github.com/celador/ForceCode/issues
I use this extension every day, so if there is something not working, I would appreciate it if you explained your error so I can fix it.
I will try to be as responsive as possible to reported issues.

##Features
* Execute Anonymous
* View Debug Logs
* Open / Retrieve a file
* Save / Compile / Deploy a file
  * w/ line errors in the editor
  * Works with Lightning Components
* Retrieve Package
* Bundle & Deploy Static Resource
* [Not fully implemented] Deploy Package

## Configuration
To begin, press `Opt+Cmd+C` or open the Command Pallete and type `>ForceCode: Menu` to bring up the ForceCode Menu
You can then enter your credentials to login to your Salesforce org.  Your configuration file will be stored in the base project directory as `force.json`.
The config file should look something like... 
```
{
    "username": "MonsterMike@Salesforce.com",
    "password": "YourPasswordHere",
    "autoCompile": true,
    "url": "https://test.salesforce.com",
    "pollTimeout": 120,
    "debugOnly": false,
    "apiVersion": "37.0",
    "enableSeperationOfConcerns": true
}
```

## Get errors as you type
The Auto-compile feature adds a hook to the save command that will automatically deploy and compile your code to your SFDC org whenever you save.  This works great with VSCode's autosave feature, providing errors as you type.  

## Commands
Forcecode provides a number of commands to work with your Salesforce org and metadata.

### Execute Anonymous
\>Force: Execute Anonymous
Keyboard: alt + cmd + e
To only show the User Debug lines, you can set the `debugOnly` setting to `true`

### Compile
\>Force: Save/Deploy/Compile
Keyboard: alt + cmd + s
To automatically compile/save your changes to Salesforce when the file is saved locally, you can set the `autoCompile` setting to `true`.  Otherwise, you will need to use alt + cmd + s to save/compile your file.

### Open  
\>Force: Get Class, Page, or Trigger
Keyboard: alt + cmd + o

### Bundle and Deploy Static Resource
\>Force: Save/Deploy/Compile
Keyboard: alt + cmd + b

### Retrieve Package
\>Force: Retrieve Package
The apiVersion used to retrieve your package (this setting is important in CI setups) comes directly from your org.  When you want to override the version of your org, set the `apiVersion` setting manually.  This is a string, with the decimal.
The pollTimeout setting is used to determine how long you should wait for the retrieve command to complete.  This should usually take less than a minute, but can take longer with large packages. 

### Get Log
\>Force: Get Logs

### Create Class
\>ForceCode Menu -> Create Class
This will automatically create classes based on `apiVersion` else it defaults to 37.0 . Enabling `enableSeperationOfConcerns` will prompt for class type and automatically append class type to class name else it defaults to true.

## Future goals
* Test runner
* Intellisense code completion
* Debug Apex code with breakpoints in the editor
* Add interfaces to Create Class
* Allow class type overrides in Create Class
