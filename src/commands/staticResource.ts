import * as vscode from 'vscode';
import fs = require('fs-extra');
import path = require('path');
import globule = require('globule');
import { zipFiles } from './../services';
const mime = require('mime-types');

export default function staticResourceBundleDeploy(context: vscode.ExtensionContext): any {
  // Login, then get Identity info, then enable logging, then execute the query, then get the debug log, then disable logging
  return Promise.resolve(vscode.window.forceCode)
    .then(getPackageName)
    .then(option => {
      if (!option) {
        return;
      }
      if (option.label === 'All Static Resources') {
        return bundleAndDeployAll().then(deployAllComplete);
      } else {
        return bundleAndDeploy(option).then(deployComplete);
      }
    });
  // =======================================================================================================================================
  function getPackageName(): any {
    let bundleDirectories: any[] = [];
    let bundlePath: string = vscode.window.forceCode.projectRoot + path.sep + 'resource-bundles';
    if (fs.existsSync(bundlePath)) {
      bundleDirectories = fs
        .readdirSync(bundlePath)
        .filter(function(file) {
          return fs.statSync(path.join(bundlePath, file)).isDirectory();
        })
        .map(d => {
          return {
            name: d.split('.resource')[0],
            type: d.split('.resource.')[1].replace('.', '/'),
          };
        });
    }
    let spaDirectories: Array<any> = [];
    let spaPath: string = vscode.window.forceCode.projectRoot + path.sep + 'spa';
    if (fs.existsSync(spaPath)) {
      spaDirectories = fs
        .readdirSync(spaPath)
        .filter(function(file) {
          return fs.statSync(path.join(spaPath, file)).isDirectory();
        })
        .map(s => {
          return { name: s, type: 'SPA' };
        });
    }

    let config: {} = {
      matchOnDescription: true,
      matchOnDetail: true,
      placeHolder: 'Choose a Resource Bundle to bundle',
    };
    let options: any[] = bundleDirectories
      .concat(spaDirectories)
      .concat([{ name: 'All Static Resources', type: 'resource-bundle' }])
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

export function staticResourceDeployFromFile(
  textDocument: vscode.TextDocument,
  context: vscode.ExtensionContext
): any {
  // This command is run when working in a file, and it's saved... It will auto bundle/deploy that static resource
  return Promise.resolve(vscode.window.forceCode)
    .then(getPackageName)
    .then(bundleAndDeploy)
    .then(deployComplete)
    .catch(onError);
  // =======================================================================================================================================
  function getPackageName() {
    let bundlePath: string =
      vscode.window.forceCode.projectRoot + path.sep + 'resource-bundles' + path.sep;
    try {
      var resourceName: string = textDocument.fileName.split(bundlePath)[1].split('.resource.')[0];
      var resType: string = textDocument.fileName
        .split(bundlePath)[1]
        .split('.resource.')[1]
        .split(path.sep)[0]
        .replace('.', '/');
    } catch (e) {}
    return {
      detail: resType,
      label: resourceName,
    };
  }
}

function onError(err) {
  var mess =
    'Invalid static resource folder or file name. Name must be in the form of ResourceName.resource.type.subtype\nEXAMPLE: ' +
    'MyResource.resource.aplication.javascript\nThis folder would then contain one file, named MyResource.js';
  vscode.window.showErrorMessage(mess + '\n' + (err.message ? err.message : err));
}

function bundleAndDeploy(option) {
  let root: string = getPackagePath(option);
  if (option.detail.includes('zip') || option.detail === 'SPA') {
    let zip: any = zipFiles(getFileList(root), root);
    return deploy(zip, option.label, option.detail).then(deployComplete);
  } else {
    var ext = '.' + mime.extension(option.detail);
    var data = fs.readFileSync(root + path.sep + option.label + ext).toString('base64');
    return vscode.window.forceCode.conn.metadata.upsert(
      'StaticResource',
      makeResourceMetadata(option.label, data, option.detail)
    );
  }
}

function bundleAndDeployAll() {
  let bundlePath: string = vscode.window.forceCode.projectRoot + path.sep + 'resource-bundles';
  if (fs.existsSync(bundlePath)) {
    return Promise.all(
      fs
        .readdirSync(bundlePath)
        .filter(function(file) {
          return fs.statSync(path.join(bundlePath, file)).isDirectory();
        })
        .map(d => {
          return bundleAndDeploy({
            detail: d.split('.resource.')[1].replace('.', '/'),
            label: d.split('.resource.')[0], //substring(0, d.lastIndexOf('.resource')),
          });
        })
    );
  }
  return undefined;
}

function getPackagePath(option) {
  var bundlePath: string = vscode.window.forceCode.projectRoot + path.sep;
  // Get package data
  if (option.detail !== 'SPA') {
    bundlePath +=
      'resource-bundles' + path.sep + option.label + '.resource.' + option.detail.replace('/', '.');
  } else {
    let dist: string = vscode.window.forceCode.config.spaDist;
    if (dist && dist !== '') {
      bundlePath += 'spa' + path.sep + option.label + path.sep + dist;
    } else {
      bundlePath += 'spa' + path.sep + option.label;
    }
  }
  return bundlePath;
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
    var _ignoreFiles: any[] = Object.keys(ignoreFiles)
      .map(key => {
        return { key: key, value: ignoreFiles[key] };
      })
      .filter(setting => setting.value === true)
      .map(setting => root + path.sep + setting.key);

    files.forEach(function(file) {
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
  })(root);
}

/**
 * @func deploy
 * The zip file is zipped and deployed
 * @param none
 * @return undefined
 */
function deploy(zip, packageName, conType) {
  return new Promise((resolve, reject) => {
    var finalPath: string = `${vscode.window.forceCode.projectRoot}${path.sep}staticresources${
      path.sep
    }${packageName}.resource`;
    zip
      .pipe(fs.createWriteStream(finalPath))
      .on('finish', () => {
        const content = fs.readFileSync(finalPath).toString('base64');
        resolve(
          vscode.window.forceCode.conn.metadata.upsert(
            'StaticResource',
            makeResourceMetadata(packageName, content, conType)
          )
        );
      })
      .on('error', err => {
        reject(err);
      });
  });
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
      cacheControl: vscode.window.forceCode.config.staticResourceCacheControl,
    },
  ];
}

function deployComplete(results) {
  vscode.window.forceCode.showStatus(`ForceCode: Deployed ${results.fullName} $(check)`);
  if (
    vscode.workspace.getConfiguration('force')['autoRefresh'] &&
    vscode.workspace.getConfiguration('force')['browser']
  ) {
    require('child_process').exec(
      `osascript -e 'tell application "${
        vscode.workspace.getConfiguration('force')['browser']
      }" to reload active tab of window 1'`
    );
  }
  return results;
}

function deployAllComplete(results) {
  vscode.window.forceCode.showStatus(`ForceCode: Deployed ${results.length} Resources $(check)`);
  if (
    vscode.workspace.getConfiguration('force')['autoRefresh'] &&
    vscode.workspace.getConfiguration('force')['browser']
  ) {
    require('child_process').exec(
      `osascript -e 'tell application "${
        vscode.workspace.getConfiguration('force')['browser']
      }" to reload active tab of window 1'`
    );
  }
  var talliedResults: {} = results.reduce(function(prev, curr) {
    return Object.assign(prev, curr);
  }, {});
  return talliedResults;
}
