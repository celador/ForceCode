import * as vscode from 'vscode';
import fs = require('fs-extra');
import path = require('path');
import jszip = require('jszip');
import globule = require('globule');
const mime = require('mime-types');

export default function staticResourceBundleDeploy(context: vscode.ExtensionContext): any {
    // Login, then get Identity info, then enable logging, then execute the query, then get the debug log, then disable logging
    return Promise.resolve(vscode.window.forceCode)
        .then(getPackageName)
        .then(option => {
            if(!option) {
                return;
            }
            if (option.label === 'All Static Resources') {
                return bundleAndDeployAll()
                    .then(deployAllComplete)
                    .catch(err => vscode.window.showErrorMessage(err.message));
            } else {
                return bundleAndDeploy(option)
                    .then(deployComplete)
                    .catch(err => vscode.window.showErrorMessage(err.message));
            }
        });
    // =======================================================================================================================================
    function getPackageName(): any {
        let bundleDirectories: any[] = [];
        let bundlePath: string = vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep + 'resource-bundles';
        if (fs.existsSync(bundlePath)) {
            bundleDirectories = fs.readdirSync(bundlePath).filter(function (file) {
                return fs.statSync(path.join(bundlePath, file)).isDirectory();
            }).map(d => {
                return { name: d.split('.resource')[0], type: d.split('.resource.')[1].replace('.', '/') };
            });
        }
        let spaDirectories: Array<any> = [];
        let spaPath: string = vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep + 'spa';
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
        let options: any[] = bundleDirectories.concat(spaDirectories).concat([{ name: 'All Static Resources', type: 'resource-bundle' }])
            .map(option => {
                return {
                    description: option.name,
                    detail: option.type,
                    label: option.name,
                };
            });
        return vscode.window.showQuickPick(options, config);

    }
}

export function staticResourceDeployFromFile(textDocument: vscode.TextDocument, context: vscode.ExtensionContext): any {
    // This command is run when working in a file, and it's saved... It will auto bundle/deploy that static resource 
    return Promise.resolve(vscode.window.forceCode)
        .then(getPackageName)
        .then(bundleAndDeploy)
        .then(deployComplete)
        .catch(onError);
    // =======================================================================================================================================
    function getPackageName() {
        let bundlePath: string = vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep + 'resource-bundles' + path.sep;
        try {
            var resourceName: string = textDocument.fileName.split(bundlePath)[1].split('.resource.')[0];
            var resType: string = textDocument.fileName.split(bundlePath)[1].split('.resource.')[1].split(path.sep)[0].replace('.', '/');
        } catch(e) {
        }
        return {
            detail: resType,
            label: resourceName,
        };
    }
}

function onError() {
    var mess = 'Invalid static resource folder or file name. Name must be in the form of ResourceName.resource.type.subtype\nEXAMPLE: '
    + 'MyResource.resource.aplication.javascript\nThis folder would then contain one file, named MyResource.js';
    vscode.window.showErrorMessage(mess);
}

function bundleAndDeploy(option) {
    let root: string = getPackagePath(option);
    if(option.detail.includes('zip')) {
        let zip: any = zipFiles(getFileList(root), root);
        bundle(zip, option.label);
        return deploy(zip, option.label, option.detail).then(deployComplete);
    } else {
        var ext = '.' + mime.extension(option.detail);
        var data = fs.readFileSync(root + path.sep + option.label + ext).toString('base64');
        return vscode.window.forceCode.conn.metadata.upsert('StaticResource', makeResourceMetadata(option.label, data, option.detail));
    }
}

function bundleAndDeployAll() {
    let bundlePath: string = vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep + 'resource-bundles';
    if (fs.existsSync(bundlePath)) {
        return Promise.all(fs.readdirSync(bundlePath).filter(function (file) {
            return fs.statSync(path.join(bundlePath, file)).isDirectory();
        }).map(d => {
            return bundleAndDeploy({
                detail: d.split('.resource.')[1].replace('.', '/'),
                label: d.split('.resource.')[0]//substring(0, d.lastIndexOf('.resource')),
            });
        }));
    }
    return undefined;
}

function getPackagePath(option) {
    var bundlePath: string = vscode.workspace.workspaceFolders[0].uri.fsPath;
    // Get package data
    if (option.detail !== 'SPA') {
        bundlePath = vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep + 'resource-bundles' + path.sep + option.label + '.resource.' + option.detail.replace('/', '.');
    } else {
        let dist: string = vscode.window.forceCode.config.spaDist;
        if (dist) {
            bundlePath = vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep + 'spa' + path.sep + option.label + path.sep + dist;
        } else {
            bundlePath = vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep + 'spa' + path.sep + option.label;
        }
    }
    return bundlePath;
}

/**
 * @private zipFiles
 * Given an array of file paths, make a zip file and add all
 * then returns the resulting zip object (not actual file) for use.
 * @param {String[]} fileList - Array of file paths
 * @return {Zip} - zip blob for use
 */
function zipFiles(fileList: string[], root: string) {
    var zip: any = new jszip();
    // Add folders and files to zip object for each file in the list
    fileList.forEach(function (file) {
        // the below code should work, according to the documentation
        // zip.file(file, content, { createFolders: true })
        // the above code should work, but for some reason it isn't so we have to add the files manually, as per the code below
        let pathFragments: string[] = file.split(path.sep);
        // reduce all the directory names, adding Folders to the zip for each folder created
        // The return of the reduce is the continuation of the parent, so adding folders just works... 
        // Do that until you have mapped all the folders, then return the zip/folder and add the file from the contents
        pathFragments.slice(0, -1)
            .reduce((parent, name) => parent.folder(name), zip)
            .file(pathFragments[pathFragments.length - 1], fs.readFileSync(root + path.sep + file));
    });

    return zip;
}

/**
 * @private zipFiles
 * Takes directory and recursively adds all child files to the list
 * with all paths being relative to the original path.
 * @param {String} relativeRoot - path (relative or absolute) of folder to recurse
 * @return {String[]} - Array of paths relative to given root
 */
function getFileList(root) {
    // Throw if not a directory
    if (!fs.statSync(root).isDirectory()) {
        return [root];
    }

    // We trap the relative root in a closure then
    // Perform the recursive file search
    return (function innerGetFileList(localPath) {
        var fileslist: any[] = []; // List of files
        var files: any = fs.readdirSync(localPath); // Files in current'sfdc' directory
        var ignoreFiles: {} = vscode.workspace.getConfiguration('force')['filesExclude'] || {
            '.gitignore': true,
            '.DS_Store': true,
            '.org_metadata': true,
            '.log': true,
            'node_modules/**': true,
            'bower_modules/**': true,
        };
        var _ignoreFiles: any[] = Object.keys(ignoreFiles).map(key => {
            return { key: key, value: ignoreFiles[key] };
        }).filter(setting => setting.value === true)
            .map(setting => root + path.sep + setting.key);

        files.forEach(function (file) {
            var pathname: string = localPath + path.sep + file;
            var stat: any = fs.lstatSync(pathname);

            // If file is a directory, recursively add it's children
            if (stat.isDirectory()) {
                fileslist = fileslist.concat(innerGetFileList(pathname));
            } else if (!globule.isMatch(_ignoreFiles, pathname, { matchBase: true, dot: true })) {
                fileslist.push(pathname.replace(root + path.sep, ''));
            }
        });
        return fileslist;
    } (root));
}

/**
 * @func bundle
 * The zip file is written to the static resource directory
 * @param none
 * @return undefined
 */
function bundle(zip, packageName) {
    // Here is replaceSrc possiblity
    var finalPath: string = `${vscode.window.forceCode.workspaceRoot}${path.sep}staticresources${path.sep}${packageName}.resource`;
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }).then(function (buffer) {
        return fs.outputFile(finalPath, buffer);
    });
}

/**
 * @func deploy
 * The zip file is zipped and deployed 
 * @param none
 * @return undefined
 */
function deploy(zip, packageName, conType) {
    // Create the base64 data to send to Salesforce 
    return zip.generateAsync({ type: 'base64', compression: 'DEFLATE' })
        .then(content => vscode.window.forceCode.conn.metadata.upsert('StaticResource', makeResourceMetadata(packageName, content, conType)));
}

/**
 * @private makeResourceMetadata
 * makes a valid static resource bundle object
 * @param {String} bundleName - Name of the bundle (WITHOUT the .resource at the end)
 * @param {ZipBlob} - generated zip blob
 * @return {Metadata[]} - Array with one metadata object
 */
function makeResourceMetadata(bundleName, cont, contType) {
    return [
        {
            fullName: bundleName,
            content: cont,
            contentType: contType,
            cacheControl: 'Private',
        },
    ];
}

function deployComplete(results) {
    vscode.window.forceCode.showStatus(`ForceCode: Deployed ${results.fullName} $(check)`);
    if (vscode.window.forceCode.config.autoRefresh && vscode.window.forceCode.config.browser) {
        require('child_process').exec(`osascript -e 'tell application "${vscode.window.forceCode.config.browser}" to reload active tab of window 1'`);
    }
    return results;
}

function deployAllComplete(results) {
    vscode.window.forceCode.showStatus(`ForceCode: Deployed ${results.length} Resources $(check)`);
    if (vscode.window.forceCode.config.autoRefresh && vscode.window.forceCode.config.browser) {
        require('child_process').exec(`osascript -e 'tell application "${vscode.window.forceCode.config.browser}" to reload active tab of window 1'`);
    }
    var talliedResults: {} = results.reduce(function (prev, curr) {
        return Object.assign(prev, curr);
    }, {});
    return talliedResults;
}
