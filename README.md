# ForceCode for Visual Studio Code
This extension is a companion for SFDC development with Visual Studio Code. 

#This extension currently only works with OS X due to issues with the xkeychain library
I am aware of the problem and am working to resolve the issues by switching to a different library.
I am in the process of trying to figure out why KeyTar isn't working.  Any pull requests would be helpful.

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
* Retrieve Package
* Bundle & Deploy Static Resource
* [Not fully implemented] Deploy Package

## Configuration
To begin, press `Opt+Cmd+C` or open the Command Pallete and type `>ForceCode: Menu` to bring up the ForceCode Menu
You can then enter your credentials to login to your Salesforce org.  Your username will be saved in your projects settings file. 

## Get errors as you type
The Auto-compile feature adds a hook to the save command that will automatically deploy and compile your code to your SFDC org whenever you save.  This works great with VSCode's autosave feature, providing errors as you type.  

## Commands
Forcecode provides a number of commands to work with your Salesforce org and metadata.

### Execute Anonymous
\>Force: Execute Anonymous
Keyboard: alt + cmd + e

### Compile
\>Force: Save/Deploy/Compile
Keyboard: alt + cmd + s

### Open  
\>Force: Get Class, Page, or Trigger
Keyboard: alt + cmd + o

### Bundle and Deploy Static Resource
\>Force: Save/Deploy/Compile
Keyboard: alt + cmd + b

### Retrieve Package
\>Force: Retrieve Package

### Get Log
\>Force: Get Logs


## Future goals
* Test runner
* Intellisense code completion
* Debug Apex code with breakpoints in the editor
* Lightning component builder
