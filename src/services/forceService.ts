import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import { codeCovViewService, fcConnection } from './../services';
import constants from './../models/constants';
import * as path from 'path';
import { FCFile } from './codeCovView';
import { getToolingTypeFromExt } from '../parsers/getToolingType';
import { Connection, IMetadataFileProperties } from 'jsforce';
import { getUUID, FCAnalytics } from './fcAnalytics';

import klaw = require('klaw');
import { QueryResult } from 'jsforce';
import { defaultOptions, readForceJson } from './configuration';
import { isEmptyUndOrNull } from '../util';

export default class ForceService implements forceCode.IForceService {
  public fcDiagnosticCollection: vscode.DiagnosticCollection;
  public config: forceCode.Config;
  public conn: Connection;
  public containerId: string | undefined;
  public containerMembers: forceCode.IContainerMember[];
  public describe: forceCode.IMetadataDescribe | undefined;
  public containerAsyncRequestId: string | undefined;
  public statusBarItem: vscode.StatusBarItem;
  public outputChannel: vscode.OutputChannel;
  public projectRoot: string;
  public workspaceRoot: string;
  public storageRoot: string;
  public statusTimeout: any;
  public uuid: string;

  constructor(context: vscode.ExtensionContext) {
    console.log('Initializing ForceCode service');
    if (!vscode.workspace.workspaceFolders) {
      throw 'A folder needs to be open before Forcecode can be activated';
    }
    this.workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    this.projectRoot = path.join(this.workspaceRoot, 'src');
    this.config = defaultOptions;
    this.fcDiagnosticCollection = vscode.languages.createDiagnosticCollection('fcDiagCol');
    this.outputChannel = vscode.window.createOutputChannel(constants.OUTPUT_CHANNEL_NAME);
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 6);
    this.statusBarItem.text = `ForceCode Loading...`;
    this.statusBarItem.show();
    this.containerMembers = [];
    this.storageRoot = context.extensionPath;

    const vsConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('force');
    const uuidRes: FCAnalytics = getUUID();
    this.uuid = uuidRes.uuid;

    console.log('Starting ForceCode service');
    new Promise(resolve => {
      if (uuidRes.firstTime) {
        // ask the user to opt-in
        return vscode.window
          .showInformationMessage(
            'The ForceCode Team would like to collect anonymous usage data so we can improve your experience. Is this OK?',
            'Yes',
            'No'
          )
          .then(choice => {
            if (choice === 'Yes') {
              vsConfig.update(
                'allowAnonymousUsageTracking',
                true,
                vscode.ConfigurationTarget.Global
              );
            } else {
              vsConfig.update(
                'allowAnonymousUsageTracking',
                false,
                vscode.ConfigurationTarget.Global
              );
            }
            resolve();
          });
      } else {
        resolve();
      }
    }).then(() => {
      const username = readForceJson();
      vscode.commands
        .executeCommand('ForceCode.switchUser', username ? { username: username } : undefined)
        .then(res => {
          if (res === false && !fcConnection.isLoggedIn()) {
            this.statusBarItem.hide();
          }
        });
    });
  }

  public clearLog() {
    this.outputChannel.clear();
  }

  public showStatus(message: string) {
    this.statusBarItem.show();
    vscode.window.forceCode.statusBarItem.text = message;
    this.resetStatus();
  }

  public resetStatus() {
    // for status bar updates. resets after 5 seconds
    clearTimeout(vscode.window.forceCode.statusTimeout);
    vscode.window.forceCode.statusTimeout = setTimeout(function() {
      vscode.window.forceCode.statusBarItem.text = `ForceCode Menu`;
    }, 5000);
  }

  public newContainer(force: Boolean): Promise<forceCode.IForceService> {
    var self: forceCode.IForceService = vscode.window.forceCode;
    if ((self.containerId && !force) || (self.containerId && self.containerMembers.length === 0)) {
      return Promise.resolve(self);
    } else {
      return self.conn.tooling
        .sobject('MetadataContainer')
        .create({ name: 'ForceCode-' + Date.now() })
        .then(res => {
          self.containerId = res.id;
          self.containerMembers = [];
          return Promise.resolve(self);
        });
    }
  }

  public checkForFileChanges() {
    return vscode.window.forceCode.conn.metadata.describe().then(res => {
      vscode.window.forceCode.describe = res;
      return this.getWorkspaceMembers().then(this.parseMembers);
    });
  }

  // Get files in src folder..
  // Match them up with ContainerMembers
  private getWorkspaceMembers(): Promise<Array<Promise<IMetadataFileProperties[]>>> {
    return new Promise(resolve => {
      var types: Array<Array<{}>> = [[]];
      var typeNames: Array<string> = [];
      var proms: Array<Promise<IMetadataFileProperties[]>> = [];
      const index = 0;
      klaw(vscode.window.forceCode.projectRoot, { depthLimit: 1 })
        .on('data', function(item) {
          // Check to see if the file represents an actual member...
          if (item.stats.isFile()) {
            var type: string | undefined = getToolingTypeFromExt(item.path);

            if (type) {
              if (!codeCovViewService.findByPath(item.path)) {
                if (!typeNames.includes(type)) {
                  typeNames.push(type);
                  if (types[index].length > 2) {
                    //index++;
                    proms.push(vscode.window.forceCode.conn.metadata.list(types.splice(0, 1)));
                    types.push([]);
                  }
                  types[index].push({ type: type });
                }

                var thePath: string | undefined = item.path.split(path.sep).pop();
                var filename: string = thePath ? thePath.split('.')[0] : '';
                var workspaceMember: forceCode.IWorkspaceMember = {
                  name: filename,
                  path: item.path,
                  id: '', //metadataFileProperties.id,
                  type: type,
                };
                codeCovViewService.addClass(workspaceMember);
              }
            }
          }
        })
        .on('end', function() {
          if (types[index].length > 0) {
            proms.push(vscode.window.forceCode.conn.metadata.list(types.splice(0, 1)));
          }
          resolve(proms);
        })
        .on('error', (err, item) => {
          console.log(`ForceCode: Error reading ${item.path}. Message: ${err.message}`);
        });
    });
  }

  private parseMembers(mems: Array<Promise<IMetadataFileProperties[]>>) {
    if (isEmptyUndOrNull(mems) || isEmptyUndOrNull(mems[0])) {
      return Promise.resolve({});
    }
    return Promise.all(mems).then(rets => {
      return parseRecords(rets);
    });

    function parseRecords(recs: any[]): Thenable<any> {
      if (!Array.isArray(recs)) {
        Promise.resolve();
      }
      console.log('Done retrieving metadata records');
      recs.forEach(curSet => {
        if (Array.isArray(curSet)) {
          curSet.forEach(key => {
            var curFCFile: FCFile | undefined = codeCovViewService.findByNameAndType(
              key.fullName,
              key.type
            );
            if (curFCFile) {
              var curMem: forceCode.IWorkspaceMember = curFCFile.getWsMember();
              curMem.id = key.id;
              if (
                curFCFile.compareDates(key.lastModifiedDate) ||
                !vscode.workspace.getConfiguration('force')['checkForFileChanges']
              ) {
                curFCFile.updateWsMember(curMem);
              } else {
                curFCFile.updateWsMember(curMem);
                vscode.commands.executeCommand(
                  'ForceCode.fileModified',
                  curMem.path,
                  key.lastModifiedByName
                );
              }
            }
          });
        }
      });
      console.log('Done getting workspace info');
      return vscode.commands
        .executeCommand('ForceCode.getCodeCoverage', undefined, undefined)
        .then(() => {
          console.log('Done retrieving code coverage');
          return Promise.resolve();
        });
    }
  }

  public connect(): Promise<forceCode.IForceService> {
    var self: forceCode.IForceService = vscode.window.forceCode;
    var config = self.config;
    if (!config.username) {
      vscode.window.showErrorMessage(
        `ForceCode: No username found. Please try to login to the org again.`
      );
      throw { message: '$(alert) Missing Credentials $(alert)' };
    }

    // get the current org info
    return Promise.resolve(self)
      .then(connectionSuccess)
      .then(getNamespacePrefix)
      .then(checkForChanges)
      .then(cleanupContainers)
      .catch(connectionError);

    // we get a nice chunk of forcecode containers after using for some time, so let's clean them on startup
    function cleanupContainers(): Promise<any> {
      return new Promise(function(resolve) {
        vscode.window.forceCode.conn.tooling
          .sobject('MetadataContainer')
          .find({ Name: { $like: 'ForceCode-%' } })
          .execute(function(err: any, records: any) {
            var toDelete: string[] = new Array<string>();
            if (!records) {
              resolve();
            }
            if (toDelete.length > 0) {
              resolve(
                vscode.window.forceCode.conn.tooling.sobject('MetadataContainer').del(toDelete)
              );
            } else {
              resolve();
            }
          });
      });
    }

    function checkForChanges(svc: forceCode.IForceService) {
      vscode.commands.executeCommand('ForceCode.checkForFileChanges', undefined, undefined);
      return svc;
    }

    function connectionSuccess(svc: forceCode.IForceService) {
      vscode.commands.executeCommand('setContext', 'ForceCodeActive', true);
      svc.statusBarItem.command = 'ForceCode.showMenu';
      svc.statusBarItem.tooltip = 'Open the ForceCode Menu';
      svc.showStatus('ForceCode Ready!');

      return svc;
    }
    function getNamespacePrefix(svc: forceCode.IForceService) {
      return svc.conn.query('SELECT NamespacePrefix FROM Organization').then((res: QueryResult) => {
        if (res && res.records.length && res.records[0].NamespacePrefix) {
          svc.config.prefix = res.records[0].NamespacePrefix;
        }
        return svc;
      });
    }
    function connectionError(err: any) {
      vscode.window.showErrorMessage(`ForceCode: Connection Error`);
      //vscode.window.forceCode.statusBarItem.hide();
      throw err;
    }
  }
}
