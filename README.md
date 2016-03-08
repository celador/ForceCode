# ForceCode for Visual Studio Code
This extension is a companion for SFDC development with Visual Studio Code. 

##Features
* Execute Anonymous
* View Debug Logs 
* Open / Retrieve a file
* Save / Compile / Deploy a file 
  * w/ line errors in the editor
* Retrieve Package

<!--
* Deploy Package
* Build / Deploy Static Resources
-->

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

##Commands
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
