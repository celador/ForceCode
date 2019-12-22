import * as vscode from 'vscode';
import * as forceCode from '../forceCode';
import {
  codeCovViewService,
  fcConnection,
  notifications,
  FCFile,
  getUUID,
  FCAnalytics,
  defaultOptions,
  readForceJson,
  getVSCodeSetting,
} from '.';
import * as path from 'path';
import { getToolingTypeFromExt } from '../parsers';
import { Connection, IMetadataFileProperties } from 'jsforce';

import klaw = require('klaw');
import { isEmptyUndOrNull } from '../util';

export class ForceService implements forceCode.IForceService {
  public fcDiagnosticCollection: vscode.DiagnosticCollection;
  public config: forceCode.Config;
  public conn!: Connection;
  public containerId: string | undefined;
  public containerMember?: forceCode.IContainerMember;
  public describe!: forceCode.IMetadataDescribe;
  public containerAsyncRequestId: string | undefined;
  public projectRoot: string;
  public workspaceRoot: string;
  public storageRoot: string;
  public uuid: string;

  constructor(context: vscode.ExtensionContext) {
    notifications.writeLog('Initializing ForceCode service');
    if (!vscode.workspace.workspaceFolders) {
      throw 'A folder needs to be open before Forcecode can be activated';
    }
    this.workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    this.projectRoot = path.join(this.workspaceRoot, 'src');
    this.config = defaultOptions;
    this.fcDiagnosticCollection = vscode.languages.createDiagnosticCollection('fcDiagCol');
    notifications.setStatusText(`ForceCode Loading...`);
    this.storageRoot = context.extensionPath;

    const vsConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('force');
    const uuidRes: FCAnalytics = getUUID();
    this.uuid = uuidRes.uuid;

    notifications.writeLog('Starting ForceCode service');
    new Promise(resolve => {
      if (uuidRes.firstTime) {
        // ask the user to opt-in
        return notifications
          .showInfo(
            'The ForceCode Team would like to collect anonymous usage data so we can improve your experience. Is this OK?',
            'Yes',
            'No'
          )
          .then(choice => {
            var option: boolean = false;
            if (choice === 'Yes') {
              option = true;
            }
            resolve(
              vsConfig.update(
                'allowAnonymousUsageTracking',
                option,
                vscode.ConfigurationTarget.Global
              )
            );
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
            notifications.hideStatus();
          }
        });
    });
  }

  public newContainer(): Promise<forceCode.IForceService> {
    var self: forceCode.IForceService = vscode.window.forceCode;
    self.containerAsyncRequestId = undefined;
    return self.conn.tooling
      .sobject('MetadataContainer')
      .create({ name: 'ForceCode-' + Date.now() })
      .then(res => {
        self.containerId = res.id;
        self.containerMember = undefined;
        return Promise.resolve(self);
      });
  }

  public checkForFileChanges() {
    return this.getWorkspaceMembers().then(this.parseMembers);
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
              var filename: string = thePath?.split('.')[0] || '';
              var workspaceMember: forceCode.IWorkspaceMember = {
                name: filename,
                path: item.path,
                id: '', //metadataFileProperties.id,
                type: type,
                coverage: new Map<string, forceCode.ICodeCoverage>(),
              };
              codeCovViewService.addClass(workspaceMember);
            }
          }
        })
        .on('end', function() {
          if (types[index].length > 0) {
            proms.push(vscode.window.forceCode.conn.metadata.list(types.splice(0, 1)));
          }
          resolve(proms);
        })
        .on('error', (err: Error, item: klaw.Item) => {
          notifications.writeLog(`ForceCode: Error reading ${item.path}. Message: ${err.message}`);
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
                !getVSCodeSetting('checkForFileChanges')
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
      notifications.writeLog('Done getting workspace info');
      return vscode.commands
        .executeCommand('ForceCode.getCodeCoverage', undefined, undefined)
        .then(() => {
          notifications.writeLog('Done retrieving code coverage');
          return Promise.resolve();
        });
    }
  }

  public connect(): Promise<forceCode.IForceService> {
    var self: forceCode.IForceService = vscode.window.forceCode;
    var config = self.config;
    if (!config.username) {
      notifications.showError(
        `ForceCode: No username found. Please try to login to the org again.`
      );
      throw { message: '$(alert) Missing Credentials $(alert)' };
    }

    vscode.commands.executeCommand('setContext', 'ForceCodeActive', true);
    notifications.setStatusCommand('ForceCode.showMenu');
    notifications.setStatusTooltip('Open the ForceCode Menu');
    notifications.showStatus('ForceCode Ready!');

    // get the current org info
    return checkForChanges()
      .then(cleanupContainers)
      .catch(connectionError);

    // we get a nice chunk of forcecode containers after using for some time, so let's clean them on startup
    function cleanupContainers(): Promise<any> {
      return new Promise(function(resolve) {
        vscode.window.forceCode.conn.tooling
          .sobject('MetadataContainer')
          .find({ Name: { $like: 'ForceCode-%' } })
          .execute(function(_err: any, records: any) {
            var toDelete: string[] = new Array<string>();
            if (!records || records.length === 0) {
              resolve();
            }
            records.forEach((rec: any) => {
              toDelete.push(rec.Id);
            });
            resolve(
              vscode.window.forceCode.conn.tooling.sobject('MetadataContainer').del(toDelete)
            );
          });
      });
    }

    function checkForChanges() {
      return Promise.resolve(
        vscode.commands.executeCommand('ForceCode.checkForFileChanges', undefined, undefined)
      );
    }

    function connectionError(err: any) {
      notifications.showError(`ForceCode: Connection Error`);
      return Promise.reject(err);
    }
  }
}
