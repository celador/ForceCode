import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import {
  configuration,
  commandService,
  codeCovViewService,
  dxService,
  fcConnection,
} from './../services';
import constants from './../models/constants';
import * as path from 'path';
import { FCFile } from './codeCovView';
import { getToolingTypeFromExt } from '../parsers/getToolingType';
import { Connection } from 'jsforce';
import { getUUID, FCAnalytics } from './fcAnalytics';

import klaw = require('klaw');

export default class ForceService implements forceCode.IForceService {
  public fcDiagnosticCollection: vscode.DiagnosticCollection;
  public config: forceCode.Config;
  public conn: Connection;
  public containerId: string;
  public containerMembers: forceCode.IContainerMember[];
  public describe: forceCode.IMetadataDescribe;
  public containerAsyncRequestId: string;
  public statusBarItem: vscode.StatusBarItem;
  public outputChannel: vscode.OutputChannel;
  public projectRoot: string;
  public workspaceRoot: string;
  public storageRoot: string;
  public statusTimeout: any;
  public uuid: string;

  constructor(context: vscode.ExtensionContext) {
    console.log('Initializing ForceCode service');
    this.workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
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
    configuration(this).then(config => {
      return new Promise(resolve => {
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
        fcConnection.connect({ username: config.username, loginUrl: config.url });
      });
    });
  }

  public clearLog() {
    this.outputChannel.clear();
  }

  public showStatus(message: string) {
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

  private parseMembers(mems) {
    if (dxService.isEmptyUndOrNull(mems)) {
      return Promise.resolve({});
    }
    var types: { [key: string]: Array<any> } = {};
    types['type0'] = mems;
    if (types['type0'].length > 3) {
      for (var i = 1; types['type0'].length > 3; i++) {
        types['type' + i] = types['type0'].splice(0, 3);
      }
    }
    let proms = Object.keys(types).map(curTypes => {
      return vscode.window.forceCode.conn.metadata.list(types[curTypes]);
    });
    return Promise.all(proms).then(rets => {
      return parseRecords(rets);
    });

    function parseRecords(recs: any[]): Promise<any> {
      if (!Array.isArray(recs)) {
        Promise.resolve();
      }
      //return Promise.all(recs).then(records => {
      console.log('Done retrieving metadata records');
      recs.forEach(curSet => {
        if (Array.isArray(curSet)) {
          curSet.forEach(key => {
            var curFCFile: FCFile = codeCovViewService.findByNameAndType(key.fullName, key.type);
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
                commandService.runCommand(
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
      return commandService
        .runCommand('ForceCode.getCodeCoverage', undefined, undefined)
        .then(() => {
          console.log('Done retrieving code coverage');
          return Promise.resolve();
        });
    }
  }

  // Get files in src folder..
  // Match them up with ContainerMembers
  private getWorkspaceMembers(): Promise<any> {
    return new Promise(resolve => {
      var types: Array<{}> = [];
      var typeNames: Array<string> = [];
      klaw(vscode.window.forceCode.projectRoot)
        .on('data', function(item) {
          // Check to see if the file represents an actual member...
          if (item.stats.isFile()) {
            var type: string = getToolingTypeFromExt(item.path);

            if (type) {
              var pathParts: string[] = item.path.split(path.sep);
              var filename: string = pathParts[pathParts.length - 1].split('.')[0];
              if (!typeNames.includes(type)) {
                typeNames.push(type);
                types.push({ type: type });
              }

              if (!codeCovViewService.findByPath(item.path)) {
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
          resolve(types);
        });
    });
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
          .execute(function(err, records) {
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

    function checkForChanges(svc) {
      commandService.runCommand('ForceCode.checkForFileChanges', undefined, undefined);
      return svc;
    }

    function connectionSuccess(svc) {
      vscode.commands.executeCommand('setContext', 'ForceCodeActive', true);
      svc.statusBarItem.command = 'ForceCode.showMenu';
      svc.statusBarItem.tooltip = 'Open the ForceCode Menu';
      svc.showStatus('ForceCode Ready!');

      return svc;
    }
    function getNamespacePrefix(svc: forceCode.IForceService) {
      return svc.conn.query('SELECT NamespacePrefix FROM Organization').then(res => {
        if (res && res.records.length && res.records[0].NamespacePrefix) {
          svc.config.prefix = res.records[0].NamespacePrefix;
        }
        return svc;
      });
    }
    function connectionError(err) {
      vscode.window.showErrorMessage(`ForceCode: Connection Error`);
      //vscode.window.forceCode.statusBarItem.hide();
      throw err;
    }
  }
}
