# README
## This is a Visual Studio Code extension for Salesforce (SFDC) development. 

###Initial goals

#### Code
* Debug Apex - Execute Anonymous from an unsaved editor window and return debug result
* View Logs - Make it easy to view the complete logs in a new unsaved editor window 
* Compile/Deploy Apex code on save
* Compile/Deploy VisualForce code on save

#### Language
* Include Apex language features, like syntax highlighting and code snippets (wave templates?)
* Include VisualForce language features, etc..

### Stretch goals
* Use code validation to highlight errors in Apex code 
* Use code validation to highlight errors in VisualForce pages 
* Debug Apex code with breakpoints in the editor

### Configuration
To assign your username and password, include the following json in your `settings.json` file, inside the `.config` folder
```
{
    "sfdc": {
        "username": "${ Username }",
        "password": "${ Password }",
        "token": "${ Token }"
    }
}
```
