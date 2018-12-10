## Change Log

* 3.11.2
    * Add retrieve support for StandardValueSet per issue #214
    * Fix issues when retrieving metadata
    * Fix issue while retrieving lightning components
    * Show nice error message when deploying code outside of the src folder
* 3.11.1
    * Add ability to make inline edits to query results and save back to the server. Simply click the cell you want to edit, make the edit, then click Save Rows.
    * Fix issue with no files being retrieved when retrieving all metadata from an org
    * Fix 'Forcecode is reporting bad "Someone has changed this file!" for Aura files' #209
* 3.11.0
    * Add ability to retrieve foldered metadata (Reports, Dashboards, Email templates, and Documents) thanks @kenhuman!
        * You can currently only save reports and dashboards. Some email template metadata can be saved, but the templates themselves can't be saved.
    * Added a query editor to replace the simple SOQL/TOQL query menu options
    * Updated keyboard shortcuts for Execute Anonymous, Open, and deploying static resources for Windows and Linux, since there was conflicts with default VSCode shortcuts (Please see the README for the new shortcuts)
    * Change default of outputQueriesAsCSV to true
    * Add custom domain support
    * Don't include expired orgs in saved usernames list
* 3.10.3
    * Update Slack invite link
* 3.10.2
    * Development fixes for OS X by @mnunezdm
* 3.10.1
    * Fix access token bug where it wasn't being refreshed automatically
* 3.10.0
    * Show orgs that have a ForceCode configuration folder saved in the project in Saved Usernames
    * Add right-click to remove ForceCode configuration folder
    * Add ability to change settings for each org with a saved ForceCode configuration in settings
    * Add ability to remove ForceCode configuration folder in settings (Current logged in org can't be removed)
    * Hide singlePackage from setting. Forcecode doen't support the folder structure required when setting this to false
    * Set checkForFileChanges to false by default for new projects
    * Fix more 'illegal value for line' issues
    * Catch deployment failed errors. ForceCode will ask if you would like to view the deployment status in the org.
    * Fix 'expired access/refresh token' error being shown instead of being asked to login again
    * Fix 'metadata of undefined' errors
    * Fix issue of ForceCode not executing any tasks once reaching the maxFileChangeNotifications limit
* 3.9.12
    * Fix login and logout issues
* 3.9.11
    * Emergency fix for startup bug where extension wouldn't start
* 3.9.10
    * Optimize the startup and login process
* 3.9.9
    * Add package builder menu option. Pick the types you want to be in your package then choose where to save
    * Added option to select types in retrieve menu option
    * Add analytics features that will help make tracking down errors a little easier
    * Retrieve standard objects when retrieving all metadata
    * Fix connection issue where users were getting 'cannot read tooling/metadata of undefined' error
    * Fix 'illegal value for line' issue when trying to save scheduled class
    * Fix errors related to lighting components (Creating new ones and errors with 'getWSMember of undefined')
    * Fix some login related issues
    * Fix extension loading issue when moving the project directory
* 3.9.7
    * Add staticResourceCacheControl setting. Now you can select if the cacheControl is public or private.
    * Fix issue with settings not loading correctly
    * Fix "illegal value for line" when saving apex classes or pages with specific errors.
    * Fix not asking for autoCompile when it's undefined. This solves saving issues.
* 3.9.6
    * Fix settings menu option throwing an error
    * Fix right-click to log out of an org
    * Fix "Cannot read property 'getWsMember' of undefined" for lightning apps and events
    * Fix ForceCode opening more than showFilesOnOpenMax
    * Fix connecting to a scratch org
    * Implement saving lighting tokens and interfaces
    * Added settings-per-org feature
    * Added option to view details of failed deployment
* 3.9.5
    * Fix compatibility issues related to login with sfdx cli
* 3.9.4
    * Fix issue with nothing showing up in the code coverage view
* 3.9.3
    * Fixed some login issues
    * Fixed invisible tasks showing up sometimes
    * Fix issue with problem reporting on Visualforce and Apex (Thanks to mnunezdm)
* 3.9.2
    * Fixed Switching Orgs and saving files results in "Insufficient access rights on cross-reference id" 
    * Fixed retrieve still hanging as a task
* 3.9.1
    * Added outputQueriesAsCSV option to allow retrieving query results as csv files instead of JSON
    * Finally fixed the hanging retrieve bug (Would hang on open, refresh, retrieve by package.xml, etc)
    * Remove manual package retrieval. If it doesn't show in the menu then it doesn't exist and retrieving by name will fail every time
* 3.9.0
    * New munu option in Deploy to choose files in your current org folder to deploy. ForceCode will build a package.xml file and deploy the files!
    * Fixed package.xml task hanging. If it gives you a deploy error, you're most likely missing at least one -meta.xml file!
    * ForceCode now retrieves code coverage (For the code coverage view) when you get the overall coverage.
    * Fixed an issue with files being shown as 'Not in current org' when there has been changed files and the user dismissed the message(s).
    * Fixed an issue with output panel stuff being shown in the 'Open Files Not In Src' section.
