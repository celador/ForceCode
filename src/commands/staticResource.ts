import * as vscode from 'vscode';
import fs = require('fs-extra');
import path = require('path');
import { zipFiles, notifications, getVSCodeSetting, saveHistoryService } from '../services';
import { ForcecodeCommand } from '.';
const mime = require('mime-types');

interface IResourceBundle {
  fullName: string;
  description?: string;
  contentType: string;
  cacheControl: string;
}

interface ResourceBundle {
  fullName: string;
  description?: string;
  content: any;
  contentType: string;
  cacheControl: string;
}

export class StaticResourceBundle extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.staticResource';
    this.name = 'Deploying static resource';
    this.hidden = false;
    this.description = 'Build and Deploy a resource bundle.';
    this.detail =
      'Create the Static Resource from the resource-bundle folder and deploy it to your org.';
    this.icon = 'file-zip';
    this.label = 'Build Resource Bundle';
  }

  public command() {
    return staticResourceBundleDeploy();
  }
}

function staticResourceBundleDeploy(): any {
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
    })
    .catch(onError);
  // =======================================================================================================================================
  function getPackageName(): any {
    let bundleDirectories: any[] = [];
    let bundlePath: string = vscode.window.forceCode.projectRoot + path.sep + 'resource-bundles';
    if (fs.existsSync(bundlePath)) {
      bundleDirectories = fs
        .readdirSync(bundlePath)
        .filter(file => {
          return fs.statSync(path.join(bundlePath, file)).isDirectory();
        })
        .map(d => {
          return {
            name: d.split('.resource')[0],
            // file deepcode ignore GlobalReplacementRegex: only need first
            type: d.split('.resource.')[1].replace('.', '/'),
          };
        });
    }
    let spaDirectories: Array<any> = [];
    let spaPath: string = vscode.window.forceCode.projectRoot + path.sep + 'spa';
    if (fs.existsSync(spaPath)) {
      spaDirectories = fs
        .readdirSync(spaPath)
        .filter(file => {
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

export function staticResourceDeployFromFile(textDocument: string): any {
  // This command is run when working in a file, and it's saved... It will auto bundle/deploy that static resource
  return Promise.resolve(vscode.window.forceCode)
    .then(getPackageName)
    .then(bundleAndDeploy)
    .then(deployComplete)
    .catch(onError)
    .then(finalRes => {
      return updateSaveHistory(textDocument, finalRes);
    });
  // =======================================================================================================================================
  function getPackageName(): vscode.QuickPickItem {
    let bundlePath: string =
      vscode.window.forceCode.projectRoot + path.sep + 'resource-bundles' + path.sep;
    var resType;
    var resourceName = '';
    try {
      resourceName = textDocument.split(bundlePath)[1].split('.resource.')[0];
      resType = textDocument
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

function onError(err: any) {
  var mess =
    'Invalid static resource folder or file name. Name must be in the form of ResourceName.resource.type.subtype\nEXAMPLE: ' +
    'MyResource.resource.application.javascript\nThis folder would then contain one file, named MyResource.js.\nSee the ' +
    'ForceCode output panel for more detail.';
  throw mess + '\n$#FC_LOG_ONLY_#*' + (err.message || err);
}

async function bundleAndDeploy(option: vscode.QuickPickItem) {
  let root: string = getPackagePath(option);
  var detail = option.detail || '';
  if (detail.includes('zip') || detail === 'SPA') {
    let zip: any = zipFiles([''], root);
    return deploy(zip, option.label, detail);
  } else {
    var ext = '.' + mime.extension(option.detail);
    var data = fs.readFileSync(root + path.sep + option.label + ext).toString('base64');
    return vscode.window.forceCode.conn.metadata.upsert(
      'StaticResource',
      await makeResourceMetadata(option.label, data, detail)
    );
  }
}

function bundleAndDeployAll() {
  let bundlePath: string = vscode.window.forceCode.projectRoot + path.sep + 'resource-bundles';
  if (fs.existsSync(bundlePath)) {
    return Promise.all(
      fs
        .readdirSync(bundlePath)
        .filter(file => {
          return fs.statSync(path.join(bundlePath, file)).isDirectory();
        })
        .map(d => {
          return bundleAndDeploy({
            detail: d.split('.resource.')[1].replace('.', '/'),
            label: d.split('.resource.')[0], //substring(0, d.lastIndexOf('.resource')),
          });
        })
    );
  } else {
    return Promise.reject();
  }
}

function getPackagePath(option: vscode.QuickPickItem) {
  var bundlePath: string = vscode.window.forceCode.projectRoot + path.sep;
  // Get package data
  if (option.detail && option.detail !== 'SPA') {
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
 * @func deploy
 * The zip file is zipped and deployed
 * @param none
 * @return undefined
 */
function deploy(zip: any, packageName: string, conType: string) {
  return new Promise((resolve, reject) => {
    var finalPath: string = `${vscode.window.forceCode.projectRoot}${path.sep}staticresources${path.sep}${packageName}.resource`;
    zip
      .pipe(fs.createWriteStream(finalPath))
      .on('finish', async () => {
        const content = fs.readFileSync(finalPath).toString('base64');
        resolve(
          vscode.window.forceCode.conn.metadata.upsert(
            'StaticResource',
            await makeResourceMetadata(packageName, content, conType)
          )
        );
      })
      .on('error', (err: any) => {
        reject(err);
      });
  });
}

/**
 * @private makeResourceMetadata
 * makes a valid static resource bundle object
 * @param {String} bundleName - Name of the bundle (WITHOUT the .resource at the end)
 * @param {ZipBlob} - generated zip blob
 * @param {String} contType - Content type of the resource
 * @return {Metadata[]} - Array with one metadata object
 */
async function makeResourceMetadata(bundleName: string, cont: any, contType: string) {
  const allSettings = getResourceSettings();
  var curSetting: IResourceBundle | undefined = findResourceSetting(bundleName, allSettings);
  let settings: ResourceBundle[] = [];
  if (!curSetting) {
    const records = await vscode.window.forceCode.conn.tooling
      .sobject('StaticResource')
      .find({ Name: bundleName })
      .execute();
    if (records.length > 0) {
      curSetting = {
        fullName: bundleName,
        description: records[0].Description,
        contentType: records[0].ContentType,
        cacheControl: records[0].CacheControl,
      };
    } else {
      curSetting = {
        fullName: bundleName,
        contentType: contType,
        cacheControl: vscode.window.forceCode.config.staticResourceCacheControl,
      };
    }
    addResourceSetting(curSetting);
  }
  const bundle: ResourceBundle = Object.assign({ content: cont }, curSetting);
  settings.push(bundle);
  return settings;
}

function getResourceSettings(): IResourceBundle[] {
  let settingsFile: string =
    vscode.window.forceCode.projectRoot +
    path.sep +
    'resource-bundles' +
    path.sep +
    'forceBundleSettings.json';
  let settings: IResourceBundle[] = [];
  if (fs.existsSync(settingsFile)) {
    settings = fs.readJSONSync(settingsFile);
  }
  return settings;
}

function findResourceSetting(
  bundleName: string,
  settings: IResourceBundle[]
): IResourceBundle | undefined {
  return settings.find(cur => cur.fullName === bundleName);
}

// add a setting if it doesn't exist
function addResourceSetting(setting: IResourceBundle) {
  let settingsFile: string =
    vscode.window.forceCode.projectRoot +
    path.sep +
    'resource-bundles' +
    path.sep +
    'forceBundleSettings.json';
  let settings: IResourceBundle[] = getResourceSettings();
  const curSetting: IResourceBundle | undefined = findResourceSetting(setting.fullName, settings);
  if (!curSetting) {
    settings.push(setting);
    fs.outputFileSync(settingsFile, JSON.stringify(settings, undefined, 4));
  }
}

function deployComplete(results: any) {
  notifications.showStatus(`ForceCode: Deployed ${results.fullName} $(check)`);
  if (getVSCodeSetting('autoRefresh') && getVSCodeSetting('browser')) {
    require('child_process').exec(
      `osascript -e 'tell application "${getVSCodeSetting(
        'browser'
      )}" to reload active tab of window 1'`
    );
  }
  return results;
}

function deployAllComplete(results: any) {
  notifications.showStatus(`ForceCode: Deployed ${results.length} Resources $(check)`);
  if (getVSCodeSetting('autoRefresh') && getVSCodeSetting('browser')) {
    require('child_process').exec(
      `osascript -e 'tell application "${getVSCodeSetting(
        'browser'
      )}" to reload active tab of window 1'`
    );
  }
  var talliedResults: {} = results.reduce((prev: any, curr: any) => {
    return Object.assign(prev, curr);
  }, {});
  return talliedResults;
}

function updateSaveHistory(document: string, res?: any): boolean {
  const success = res?.success ? res?.success : false;
  saveHistoryService.addSaveResult({
    fileName: document.split(path.sep).pop() || 'UNKNOWN',
    path: document,
    success: success,
    messages: [''],
  });
  return success;
}
