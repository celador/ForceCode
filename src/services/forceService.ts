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
  commandViewService,
} from '.';
import * as path from 'path';
import { Connection, IMetadataFileProperties } from 'jsforce';

import { isEmptyUndOrNull } from '../util';
import { SaveResult } from './saveHistoryService';
import { CoverageRetrieveType } from './commandView';
import { getSrcDir, VSCODE_SETTINGS } from './configuration';
import * as fs from 'fs-extra';

export class ForceService implements forceCode.IForceService {
  public fcDiagnosticCollection: vscode.DiagnosticCollection;
  public config: forceCode.Config;
  public conn!: Connection;
  public describe!: forceCode.IMetadataDescribe;
  public workspaceRoot: string;
  public storageRoot: string;
  public uuid: string;
  public lastSaveResult: SaveResult | undefined;
  public creatingFile: boolean = false;
  private interval: NodeJS.Timeout | undefined;

  constructor(context: vscode.ExtensionContext) {
    notifications.writeLog('Initializing ForceCode service');
    if (!vscode.workspace.workspaceFolders) {
      throw 'A folder needs to be open before Forcecode can be activated';
    }
    this.workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    this.config = defaultOptions;
    this.fcDiagnosticCollection = vscode.languages.createDiagnosticCollection('fcDiagCol');
    notifications.setStatusText(`ForceCode Loading...`, true);
    this.storageRoot = context.extensionPath;

    const vsConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('force');
    const uuidRes: FCAnalytics = getUUID();
    this.uuid = uuidRes.uuid;

    notifications.writeLog('Starting ForceCode service');
    new Promise((resolve) => {
      if (uuidRes.firstTime) {
        // ask the user to opt-in
        return notifications
          .showInfo(
            'The ForceCode Team would like to collect anonymous usage data so we can improve your experience. Is this OK?',
            'Yes',
            'No'
          )
          .then((choice) => {
            let option: boolean = false;
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
        resolve(undefined);
      }
    }).then(() => {
      const username = readForceJson();
      vscode.commands
        .executeCommand('ForceCode.switchUser', username ? { username: username } : undefined)
        .then((res) => {
          if (res === false && !fcConnection.isLoggedIn()) {
            notifications.hideStatus();
          }
        });
    });
  }

  public checkForFileChanges(skipChanges?: boolean) {
    return this.getWorkspaceMembers().then((mems) => this.parseMembers(mems, skipChanges));
  }

  public checkForFileChangesQueue() {
    if (this.interval) {
      clearTimeout(this.interval);
    }
    this.interval = setTimeout(
      () => vscode.commands.executeCommand('ForceCode.checkForFileChanges', true, undefined),
      1000
    );
  }

  // Get files in src folder..
  // Match them up with ContainerMembers
  private getWorkspaceMembers(): Promise<Array<Promise<IMetadataFileProperties[]>>> {
    return new Promise((resolve, _reject) => {
      let types: Array<{}> = [];
      //let typeNames: Array<string> = [];
      let proms: Array<Promise<IMetadataFileProperties[]>> = [];
      if (fs.existsSync(path.join(getSrcDir(), 'classes'))) {
        types.push({ type: 'ApexClass' });
      }
      if (fs.existsSync(path.join(getSrcDir(), 'components'))) {
        types.push({ type: 'ApexComponent' });
      }
      if (fs.existsSync(path.join(getSrcDir(), 'triggers'))) {
        if (types.length > 2) {
          //index++;
          proms.push(vscode.window.forceCode.conn.metadata.list(types));
          types = [];
        }
        types.push({ type: 'ApexTrigger' });
      }
      if (fs.existsSync(path.join(getSrcDir(), 'pages'))) {
        if (types.length > 2) {
          //index++;
          proms.push(vscode.window.forceCode.conn.metadata.list(types));
          types = [];
        }
        types.push({ type: 'ApexPage' });
      }
      if (types.length > 0) {
        proms.push(vscode.window.forceCode.conn.metadata.list(types));
      }
      resolve(proms);
    });
  }

  private parseMembers(mems: Array<Promise<IMetadataFileProperties[]>>, skipChanges?: boolean) {
    if (isEmptyUndOrNull(mems) || isEmptyUndOrNull(mems[0])) {
      return Promise.resolve({});
    }
    return Promise.all(mems).then((rets) => {
      return parseRecords(rets);
    });

    function parseRecords(recs: any[]): Thenable<any> {
      if (!Array.isArray(recs)) {
        Promise.resolve();
      }
      let apexType = false;
      recs.forEach((curSet) => {
        if (Array.isArray(curSet)) {
          curSet.forEach((key) => {
            let thePath: string = path.join(getSrcDir(), key.fileName);
            if (fs.existsSync(thePath)) {
              let workspaceMember: forceCode.IWorkspaceMember = {
                name: key.fullName,
                path: thePath,
                id: key.id,
                type: key.type,
                coverage: new Map<string, forceCode.ICodeCoverage>(),
              };

              apexType = key.type === 'ApexClass' || key.type === 'ApexTrigger';

              let curFCFile: FCFile = codeCovViewService.addClass(workspaceMember);

              if (
                !skipChanges &&
                getVSCodeSetting(VSCODE_SETTINGS.checkForFileChanges) &&
                !curFCFile.compareDates(key.lastModifiedDate)
              ) {
                vscode.commands.executeCommand(
                  'ForceCode.fileModified',
                  thePath,
                  key.lastModifiedByName
                );
              }
            }
          });
        }
      });
      notifications.writeLog('Done getting workspace info');
      if (skipChanges && apexType) {
        return commandViewService.enqueueCodeCoverage(CoverageRetrieveType.OpenFile);
      } else {
        return commandViewService.enqueueCodeCoverage(CoverageRetrieveType.StartUp);
      }
    }
  }

  public connect(): Promise<forceCode.IForceService> {
    let self: forceCode.IForceService = vscode.window.forceCode;
    let config = self.config;
    if (!config.username) {
      notifications.showError(
        `ForceCode: No username found. Please try to login to the org again.`
      );
      throw { message: '$(alert) Missing Credentials $(alert)' };
    }

    vscode.commands.executeCommand('setContext', 'ForceCodeActive', true);
    notifications.setStatusCommand('ForceCode.showMenu');
    notifications.setStatusTooltip('Open the ForceCode Menu');
    notifications.resetLoading();
    notifications.showStatus('ForceCode Ready!');

    // get the current org info
    return checkForChanges().then(cleanupContainers).catch(connectionError);

    // we get a nice chunk of forcecode containers after using for some time, so let's clean them on startup
    function cleanupContainers(): Promise<any> {
      return new Promise(function (resolve) {
        vscode.window.forceCode.conn.tooling
          .sobject('MetadataContainer')
          .find({ Name: { $like: 'ForceCode-%' } })
          .execute(function (_err: any, records: any) {
            let toDelete: string[] = [];
            if (!records || records.length === 0) {
              resolve(undefined);
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
