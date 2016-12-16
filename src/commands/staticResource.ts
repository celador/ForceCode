import * as vscode from 'vscode';
import fs = require('fs-extra');
import path = require('path');
import jszip = require('jszip');
// import jsforce = require('jsforce');
import globule = require('globule');
import { IForceService } from './../forceCode';
import * as error from './../util/error';

export default function staticResourceBundleDeploy(context: vscode.ExtensionContext): any {
  // Login, then get Identity info, then enable logging, then execute the query, then get the debug log, then disable logging
  return vscode.window.forceCode.connect(context)
    .then(getPackageName)
    .then(option => {
      if (option.label === 'All Static Resources') {
        return bundleAndDeployAll()
        .then(deployAllComplete)
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));
      } else {
        return bundleAndDeploy(option)
        .then(deployComplete)
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));
      }
    });
  // =======================================================================================================================================
  function getPackageName(service: IForceService): any {
    vscode.window.forceCode.statusBarItem.text = `ForceCode: Get Packages $(list-unordered)`;
    let bundleDirectories: any[] = [];
    let bundlePath: string = vscode.workspace.rootPath + path.sep + 'resource-bundles';
    if (fs.existsSync(bundlePath)) {
      bundleDirectories = fs.readdirSync(bundlePath).filter(function (file) {
        return fs.statSync(path.join(bundlePath, file)).isDirectory();
      }).map(d => d.split('.resource')[0]).map(d => {
        return { name: d, type: 'resource-bundle' };
      });
    }

    let config: {} = {
      matchOnDescription: true,
      matchOnDetail: true,
      placeHolder: 'Choose a Resource Bundle to bundle',
    };
    let options: any[] = bundleDirectories.concat([{ name: 'All Static Resources', type: 'resource-bundle' }])
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
  return vscode.window.forceCode.connect(context)
    .then(getPackageName)
    .then(bundleAndDeploy);
  // =======================================================================================================================================
  function getPackageName(service: IForceService) {
    let bundlePath: string = vscode.workspace.rootPath + path.sep + 'resource-bundles' + path.sep;
    var resourceName: string = textDocument.fileName.split(bundlePath)[1].split('.resource')[0];
    return {
      detail: 'resource-bundle',
      label: resourceName
    };
  }
}

function bundleAndDeploy(option) {
  return Promise.resolve(getPackagePath(option))
    .then(root => zipFiles(getFileList(root), root))
    .then(zip => bundle(zip, option.label))
    .then(zip => deploy(zip, option.label));
}

function bundleAndDeployAll() {
  let bundlePath: string = vscode.workspace.rootPath + path.sep + 'resource-bundles';
  if (fs.existsSync(bundlePath)) {
    return Promise.all(fs.readdirSync(bundlePath).filter(function (file) {
      return fs.statSync(path.join(bundlePath, file)).isDirectory();
    }).map(d => {
      return bundleAndDeploy({
        detail: 'resource-bundle',
        label: d.substring(0, d.lastIndexOf('.')),
      });
    }));
  }
}

function getPackagePath(option) {
  var bundlePath: string = vscode.workspace.rootPath;
  vscode.window.forceCode.statusBarItem.text = `ForceCode: Making Zip $(fold)`;
  // Get package data
  if (option.detail === 'resource-bundle') {
    bundlePath = vscode.workspace.rootPath + path.sep + 'resource-bundles' + path.sep + option.label + '.resource';
  }
  if (option.detail === 'SPA') {
    bundlePath = vscode.workspace.rootPath + path.sep + 'spa' + path.sep + option.label;
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
  // Add files to zip object
  fileList.forEach(function (file) {
    var content: any = fs.readFileSync(root + path.sep + file);
    // zip.file(file, content, { createFolders: true })
    var pathFragments: string[] = file.split(path.sep);
    pathFragments.slice(0, -1).reduce(function(parent, name) {
      return parent.folder(name);
    }, zip).file(pathFragments[pathFragments.length - 1], content);
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
    throw new Error('');
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
  var finalPath: string = vscode.workspace.rootPath + path.sep + vscode.window.forceCode.config.src + path.sep + 'staticresources' + path.sep + packageName + '.resource';
  vscode.window.forceCode.statusBarItem.text = `ForceCode: Bundling Resource $(beaker)`;
  zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }).then(function (buffer) {
    fs.outputFile(finalPath, buffer);
  });
  return zip;
}

/**
 * @func deploy
 * The zip file is zipped and deployed 
 * @param none
 * @return undefined
 */
function deploy(zip, packageName) {
  vscode.window.forceCode.statusBarItem.text = `ForceCode: Deploying $(rocket)`;
  // Create the base64 data to send to Salesforce 
  return zip.generateAsync({ type: 'base64', compression: 'DEFLATE' }).then(function (content) {
    var metadata: any = makeResourceMetadata(packageName, content);
    return vscode.window.forceCode.conn.metadata.upsert('StaticResource', metadata);
  });
}

/**
 * @private makeResourceMetadata
 * makes a valid static resource bundle object
 * @param {String} bundleName - Name of the bundle (WITHOUT the .resource at the end)
 * @param {ZipBlob} - generated zip blob
 * @return {Metadata[]} - Array with one metadata object
 */
function makeResourceMetadata(bundleName, content) {
  return [
    {
      fullName: bundleName,
      description: 'spa data files',
      content: content,
      contentType: 'application/zip',
      cacheControl: 'Private',
    },
  ];
}

function deployComplete(results) {
  vscode.window.forceCode.statusBarItem.text = `ForceCode: Deployed ${results.fullName} $(check)`;
  if (vscode.window.forceCode.config.autoRefresh && vscode.window.forceCode.config.browser) {
    require('child_process').exec(`osascript -e 'tell application "${vscode.window.forceCode.config.browser}" to reload active tab of window 1'`);
  }
  console.log('results are: ', results);
  console.log('success: ' + results.success);
  console.log('created: ' + results.created);
  console.log('fullName: ' + results.fullName);
  return results;
}

function deployAllComplete(results) {
  vscode.window.forceCode.statusBarItem.text = `ForceCode: Deployed ${results.length} Resources $(check)`;
  if (vscode.window.forceCode.config.autoRefresh && vscode.window.forceCode.config.browser) {
    require('child_process').exec(`osascript -e 'tell application "${vscode.window.forceCode.config.browser}" to reload active tab of window 1'`);
  }
  var talliedResults = results.reduce(function(prev, curr, idx, arr){
    return Object.assign(prev, curr);
  }, {});
  console.log('Deployed: ', results.length, ' bundles');
  return talliedResults;
}
