## Change Log

* 4.2.2
    * Fix "undefined" error when an org is locked from a changeset and a user tries to deploy
* 4.2.1
    * Fixed issues with compile errors not being shown in the problems panel specifically with LWCs
* 4.2.0
    * Fixed issues with compile errors not being shown in the problems panel
    * Files shown when clicking the Open Salesforce File option are now in alphabetical order
    * Support diffing the following meta.xml file types:
        * Apex (class and trigger)
        * Aura
        * LWC
        * Visualforce
* 4.1.1
    * Switched to using sf commands instead of sfdx from the CLI. If you receive errors about the CLI not being found then please reinstall it after downloading from https://developer.salesforce.com/tools/sfdxcli
    * Bug fixes and performance improvements
    * Updated UI for settings, soql editor, and bulk loader
    * Remove analytics, who has time to keep up with checking that stuff anyways??
* 4.1.0
    * Fix logs, overall coverage, etc. showing in 3rd column
    * Allow log saves
    * Show running tasks via badge instead of a menu item
* 4.0.5
    * Auto detect the api version from the org
    * Dependency updates
* 4.0.4
    * Auto clear "stuck" tasks after 5 minutes
    * Fix code coverage not being updated in the org with newer version of SFDX CLI
* 4.0.3
    * Dependency updates
* 4.0.2
    * Add `ForceCode: Search Code in Org` command. This can be used from the command pallet, right clicking when text is selected, or by shortcuts.
    * Fix cancelling of Code Completion Refresh command getting stuck
    * Fix metadata of undefined issue on load on rare occasions
* 4.0.1
    * Fix default project folder when switching orgs (was defaulting to src in some cases)
    * Fix `Cannot read property 'pause' of undefined`
* 4.0.0
    * Added the ability to create and work in SFDX Source projects
    * Fix retrieve getting stuck when exiting the menu
* 3.22.13
    * Fix Illegal value for line with test coverage
    * Fix only showing one file changed notification for multiple files with the same name
    * Remove `SFDX_JSON_TO_STDOUT` as it's no longer used.
* 3.22.12
    * Fix issue with `Existing SFDX project found...`. ForceCode will now attempt to resolve the issue itself.
    * Fix whitespace issue when checking for changes while deploying LWCs.
    * Fix issues with code coverage.
    * Performance improvements.
* 3.22.11
    * Performance improvements
* 3.22.10
    * Report deployment errors in the problems panel instead of asking to open Salesforce #387
    * Update to jsforce 1.10.1
    * Update dependencies
    * Fixed save issue with expired access token.
    * Performance improvements on startup.
* 3.22.9
    * Added options to `Allow to retrieve code coverage on demand` #377
        * Enable/disable retrieval of code coverage on start up and when retrieving/opening a file from the server. Options are located in the ForceCode extension's options.
        * Button on the code coverage view allows manual retrieval of code coverage.
* 3.22.8
    * Fix `Error when trying to save: getaddrinfo ENOTFOUND` #121
* 3.22.7
    * Updated dependencies
    * Allow for selecting a Default test level when deploying #373
* 3.22.6
    * Fix retrieving from package with only one type. This resolves `Retrieve from package.xml feature doesn't retrieve settings metadata` #368
* 3.22.5
    * Fix `Forcecode won't deploy file on save after a while` #364
* 3.22.4
    * Update dependencies
* 3.22.3
    * Fix `Record id is not found in record after timeout on class save to org occurred` #361
    * Update for API 48.0
    * Update dependencies
* 3.22.2
    * Add ability to change settings for static resources (Per resource) via using a `forceBundleSettings.json` file in the `resource-bundle` folder. This file will be auto-generated upon save of a static resource. If the resource exists in the org, the current settings of the resource will be used in the file.
    * Update Slack invite link #357
    * Fix issue saving binary static resource files (JPG, PNG, etc)
* 3.22.1
    * Transitioned delete functionality to SFDX. Now more types are supported for deleting from an org.
* 3.22.0
    * Add ignore functionality via the Forcecode `force.filesExclude` workspace setting. This can be used when deploying files to ignore files/folders. Forcecode now also respects `.forceignore` files in your workspace root as well. A `.forceignore` file will always supersede the `force.filesExclude` workspace setting. When choosing files to deploy, the ignore settings will be respected as well (Ignored files won't show in the list of files to choose from).
    * Add ability to remove source from org. Aura component pieces can be removed individually or as a whole. If you delete the Aura component's `cmp`, `app`, etc file or the `-meta.xml` file then the whole bundle will be removed from the org. When deleting an LWC, the whole bundle will ALWAYS be removed!
        * Currently, delete functionality is limited only to certain metadata (All metadata that can be created via the `New` menu option is supported and a few others). If you receive an error stating that the metadata wasn't found in the org and you are sure it is indeed there, then the type is not currently supported for deletion by Forcecode 
    * Fix "Cannot Deploy After Comparing" #354
* 3.21.4
    * Fix "Record id is not found in record" after create a new class #349
* 3.21.3
    * Fix issues switching usernames in the Saved Usernames view
    * Queue code coverage retrieval so it isn't called multiple times when refreshing modified files
* 3.21.2
    * Fix issue deploying static resources
    * Fix retrieval of static resource when working in the resource-bundles folder
    * Add option to reload the window after retrieving sObjects during a code completion refresh in order to reload the Apex extension
* 3.21.1
    * Fix `Deploy only working after a save command` #345
    * Fix `Save/Deploy/Compile Check for Diffs` #334
* 3.21.0
    * Add ability to save multiple files at a time, no need to wait for your apex class to finish before saving your trigger!
    * Add diff in context menu for aura and lwc
* 3.20.2
    * Fix issue with saving VisualForce pages and being shown a file change notification every time.
* 3.20.1
    * Turn on line decorations when a class in the Code Coverage view is clicked.
* 3.20.0
    * Add test coverage broken down by test class/method. Now you can see which test classes and methods are covering your class! Click on the dropdown next to a class name in the `Sufficient Coverage` or `Insufficient Coverage` section and you will be presented with a list of test classes and methods that cover your class. Clicking on one of these will open the tested class and update the coverage decorations to show you visually which lines are covered by each. This addresses the issue `Show test classes covering my class.` #329. Thanks @Caio-Carvalho for the request for this!
* 3.19.2
    * Fix `LightningMessageChannel not supported` #336. The `Production / Developer` option when logging into a new org has been split into separate options. For existing projects, if you want to try out the LightningMessageCenter Beta feature, you will need to open your Org Settings in the Forcecode menu and check the isDeveloperEdition checkbox then save in order to open Lightning Message Center files. Only developer editions (NOT SANDBOXES) currently support this feature! You will get an error message having this checked with a sandbox using API version 47.0!
* 3.19.1
    * Added Lightning Message Center metadata in `New` menu option as well as a type retrievable by the `Open` menu option
* 3.19.0
    * Updated default API version for Winter release (47.0)
    * Update vulnerabilities in dependencies
* 3.18.11
    * Reworded save timeout for apex. User must choose `Yes` now to continue polling for a status update.
    * Fix deploying custom fields
* 3.18.10
    * Fix folder metadata not being included in package.xml
    * Fix wrong tooling type detected by folder
* 3.18.9
    * Fix wrong slash being used in package xml files while trying to retrieve foldered metadata (Reports, Document, Dashboards, etc)
* 3.18.8
    * Fix `Orgs not properly switching in the Saved Usernames view` #321
* 3.18.7
    * Fix `New Lightning components not being deployed` #319
* 3.18.6
    * Fix `"Retrieve Package/Metadata" commands result in "Metadata describe error"` #315 
* 3.18.5
    * Fix project root not being assigned correctly, leading to the extension not functioning
* 3.18.4
    * Added support to select a definition file when creating a scratch org
    * Updated Forcecode view icon
    * Start-up performance improvements when loading an existing project
    * Fix missed `typeof` in fix for `Relationship fields not displayed` #306
* 3.18.3
    * Fix `Package not retrieved via Retrieve Package menu option` #312
    * Fix deploying certain metadata types.
* 3.18.2
    * Fix `Relationship fields not displayed` #306
    * Fix `e.split is not a function` #307
* 3.18.1
    * Fix not showing errors when metadata has a syntax error
    * Fix not refreshing an expired access token when saving a static resource
* 3.18.0
    * Performance improvements on startup
    * Execute anonymous output is now shown in a document like Apex test logs
    * Logging output is now shown in the Forcecode output panel
    * Show debug logs with dated names
    * Fix execute anonymous when project folder contains a space
    * Fix error related to ForceCode.treeDataProvider
    * Fix not catching some SFDX CLI errors
    * Fix Execute Anonymous functionality
    * Fix window not reloading when creating a project in a folder that's already open in VSCode
    * Fix various menus throwing errors when the user canceled or didn't make a selection
    * Add `bulkLoaderPollTimeout` setting in workspace settings to control the bulk load timeout. Default is 60000 (1 minute)
    * Add inline run test button to test classes listed in the Code Coverage view
    * Add inline cancel task button on cancellable running tasks
    * Add number of lines covered in Forcecode Code Coverage view hovers
    * Add time saved to end of SUCCESS! in save history view tooltip
    * Add option to cancel Apex save when it times out. This avoids receiving the container request error.
* 3.17.4
    * Fix issue with extension not loading
    * Fix issues retrieving debug logs
* 3.17.2
    * Fix being able to create a scratch org
    * Open Lightning when checking deployment status or opening file in org
    * Fix issue with receiving error about not being able to find the SFDX CLI when trying to view deployment error details
    * Fix issue with logging in when clicking on an org in the saved usernames list with a yellow circle
* 3.17.1
    * Fix users not receiving error message when SFDX wasn't installed on startup.
* 3.17.0
    * Allow retrieval of managed package reports/dashboards/etc.
    * Fix "Never prompts for diff/overwrite on save for Lightning Web Components" #280
    * Fix "3.16.0 not able to save LWC" #277
    * Fix "Forcecode hangs when there is a failed login attempt." #275
    * Remove salesforce-alm dependency. Users are now REQUIRED to install the SFDX-CLI
    * Because of salesforce-alm removal, the run DX command menu option has been removed.
    * Switched back to using webpack to pack the extension
    * Added ability to cancel running ForceCode Tasks! #186
    * Show error message with a link to download if the SFDX CLI isn't installed.
