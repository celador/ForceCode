# ForceCode for Visual Studio Code
This extension is a companion for SFDC development with Visual Studio Code. 

# There is currently an issue with the NPM version used
You must go into the ForceCode extension directory and run `npm install`

##Features
* Execute Anonymous
* View Debug Logs 
* Open / Retrieve a file
* Save / Compile / Deploy a file 
  * w/ line errors in the editor
* [Not fully implemented] Retrieve Package
* [Not fully implemented] Deploy Package
* [Not fully implemented] Build/Deploy Static Resource(s)

## Configuration
To assign your username and password, include the following json in your `settings.json` file, inside the `.config` folder
```
{
    "sfdc": {
        "username": "${ Username }",
        "password": "${ Password }",
        "token": "${ Token }",
        "autoCompile": true
    }
}
```
####Get errors as you type
The Auto-compile feature adds a hook to the save command that will automatically deploy and compile your code to your SFDC org whenever you save.  This works great with VSCode's autosave feature, providing errors as you type.  

##Commands
Forcecode provides a number of commands to work with your Salesforce org and metadata.
###Execute Anonymous
\>Force: Execute Anonymous  
Keyboard: alt + cmd + e

###Compile
\>Force: Save/Deploy/Compile  
Keyboard: alt + cmd + s

###Get Log
\>Force: Get Logs  
Keyboard: alt + cmd + i

###Open  
\>Force: Get Class, Page, or Trigger  
Keyboard: alt + cmd + o

###Retrieve Package
\>Force: Get Package from Org  


## Future goals
* Test runner
* Intellisense code completion
* Debug Apex code with breakpoints in the editor
* Lightning component builder
