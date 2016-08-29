import * as vscode from 'vscode';
import fs = require('fs-extra');
import path = require('path');
import jszip = require('jszip');
// import jsforce = require('jsforce');
import globule = require('globule');
import {IForceService} from './../forceCode';
import * as error from './../util/error';
var packageName: string = undefined;
var relativeRoot: string = undefined;
var outputChannel: vscode.OutputChannel;

export default function staticResourceBundleDeploy(context: vscode.ExtensionContext): any {
    'use strict';
    outputChannel = vscode.window.forceCode.outputChannel;

    // Login, then get Identity info, then enable logging, then execute the query, then get the debug log, then disable logging
    return vscode.window.forceCode.connect(context)
        .then(getPackageName)
        .then(getPackagePath)
        .then(makeZip)
        .then(bundle)
        .then(deploy)
        .then(onComplete)
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function getPackageName(service: IForceService) {
        vscode.window.setStatusBarMessage(`ForceCode: Get Packages $(list-unordered)`);
        let bundleDirectories = [];
        let bundlePath = vscode.workspace.rootPath + '/resource-bundles';
        if (fs.existsSync(bundlePath)) {
            bundleDirectories = fs.readdirSync(bundlePath).filter(function (file) {
                return fs.statSync(path.join(bundlePath, file)).isDirectory();
            }).map(d => d.split('.resource')[0]).map(d => {
                return { name: d, type: 'resource-bundle' };
            });
        }
        let spaDirectories: Array<any> = [];
        let spaPath: string = vscode.workspace.rootPath + '/spa';
        if (fs.existsSync(spaPath)) {
            spaDirectories = fs.readdirSync(spaPath).filter(function (file) {
                return fs.statSync(path.join(spaPath, file)).isDirectory();
            }).map(s => {
                return { name: s, type: 'SPA' };
            });
        }

        let config: {} = {
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: 'Choose a Resource Bundle to bundle',
        };
        let options = bundleDirectories.concat(spaDirectories).map(option => {
            // let icon: string = getIcon('');
            return {
                description: option.name,
                detail: option.type,
                label: option.name,
            };
        });
        return vscode.window.showQuickPick(options, config);

    }

    function getPackagePath(option) {
        vscode.window.setStatusBarMessage(`ForceCode: Making Zip $(fold)`);
        packageName = option.label;
        let bundlePath = vscode.workspace.rootPath;
        // Get package data
        if (option.detail === 'resource-bundle') {
            bundlePath = vscode.workspace.rootPath + '/resource-bundles/' + option.label + '.resource';
        }
        if (option.detail === 'SPA') {
            bundlePath = vscode.workspace.rootPath + '/spa/' + option.label;
        }
        return bundlePath;
    }

    // Make Zip uses the two subsequent functions
    function makeZip(root) {
        // Create a Zip Object from which we can generate data, with which we do things...
        //  Get a file list that we generate from a path defined in the package.json.
        relativeRoot = root;
        var fileList = getFileList(relativeRoot);
        var zip = zipFiles(fileList);
        return zip;
    }

    /**
     * @private zipFiles
     * Given an array of file paths, make a zip file and add all
     * then returns the resulting zip object (not actual file) for use.
     * @param {String[]} fileList - Array of file paths
     * @return {Zip} - zip blob for use
     */
    function zipFiles(fileList: string[]) {
        var zip = new jszip();

        // Add files to zip object
        fileList.forEach(function (file) {
            // var relativePath = file.split(relativeRoot)[1] || file;
            var content = fs.readFileSync(relativeRoot + '/' + file);
            zip.file(file, content);
        });

        return zip;
    };

    /**
     * @private zipFiles
     * Takes directory and recursively adds all child files to the list
     * with all paths being relative to the original path.
     * @param {String} relativeRoot - path (relative or absolute) of folder to recurse
     * @return {String[]} - Array of paths relative to given root
     */
    function getFileList(relativeRoot) {
        // Throw if not a directory

        if (!fs.lstatSync(relativeRoot).isDirectory()) {
            throw new Error('');
        }

        // We trap the relative root in a closure then
        // Perform the recursive file search
        return (function innerGetFileList(localPath) {
            var fileslist = []; // List of files
            var files = fs.readdirSync(localPath); // Files in current'sfdc' directory
            var ignoreFiles: {} = vscode.workspace.getConfiguration('force')['filesExclude'] || {
                '.gitignore': true,
                '.DS_Store': true,
                '.org_metadata': true,
                '.log': true,
                'node_modules/**': true,
                'bower_modules/**': true,
            };
            var _ignoreFiles = Object.keys(ignoreFiles).map(key => {
                return { key: key, value: ignoreFiles[key] };
            })
                .filter(setting => setting.value === true)
                .map(setting => relativeRoot + '/' + setting.key);

            files.forEach(function (file) {
                var pathname = localPath + '/' + file;
                var stat = fs.lstatSync(pathname);

                // If file is a directory, recursively add it's children
                if (stat.isDirectory()) {
                    fileslist = fileslist.concat(innerGetFileList(pathname));
                    // Otherwise, add the file to the file list
                    // } else if (!_ignoreFiles.some(p => isMatch(p, file))) {
                } else if (!globule.isMatch(_ignoreFiles, pathname, { matchBase: true, dot: true })) {
                    fileslist.push(pathname.replace(relativeRoot + '/', ''));
                }
            });
            return fileslist;
        } (relativeRoot));
    };

    function isMatch(path, file) {
        var regex = new RegExp(file + '$');
        return path.match(regex);
    }
    /**
     * @func bundle
     * The zip file is written to the static resource directory
     * @param none
     * @return undefined
     */
    function bundle(zip) {
        vscode.window.setStatusBarMessage(`ForceCode: Bundling Resource $(beaker)`);
        var buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        // Copy the zip to the StaticResource folder
        var finalPath = vscode.workspace.rootPath + '/src/staticresources/' + packageName + '.resource';
        fs.writeFile(finalPath, buffer, 'binary');
        return zip;
    };

    /**
     * @func deploy
     * The zip file is zipped and deployed 
     * @param none
     * @return undefined
     */
    function deploy(zip) {
        vscode.window.setStatusBarMessage(`ForceCode: Deploying $(rocket)`);
        // Create the base64 data to send to Salesforce 
        var zipFile = zip.generate({ base64: true, compression: 'DEFLATE' });
        var metadata = makeResourceMetadata(packageName, zipFile);
        return vscode.window.forceCode.conn.metadata.upsert('StaticResource', metadata);
    };

    /**
     * @private makeResourceMetadata
     * makes a valid static resource bundle object
     * @param {String} bundleName - Name of the bundle (WITHOUT the .resource at the end)
     * @param {ZipBlob} - generated zip blob
     * @return {Metadata[]} - Array with one metadata object
     */
    function makeResourceMetadata(bundleName, zipFile) {
        return [{
            fullName: bundleName,
            description: 'spa data files',
            content: zipFile,
            contentType: 'application/zip',
            cacheControl: 'Private'
        }];
    };

    function onComplete(results) {
        'use strict';
        vscode.window.setStatusBarMessage(`ForceCode: Deploy Success $(check)`);
        //   exec('osascript -e \'tell app 'Google Chrome' to tell the active tab of its first window to reload\'');
        console.log('results are: ', results);
        console.log('success: ' + results.success);
        console.log('created: ' + results.created);
        console.log('fullName: ' + results.fullName);
        return results;
    };

    /**
     * @private onError
     * Error Handler
     * @param {Object} err - The Error object
     * @return {Boolean} - The return value
     */
    // function onError(err) {
    //     'use strict';
    //     vscode.window.setStatusBarMessage(`ForceCode: Error $(stop)`);
    //     outputChannel.appendLine('================================================================');
    //     outputChannel.appendLine(err);
    //     return err;
    // };
}
