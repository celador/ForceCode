import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { dxService, FCOauth, FCConnection, operatingSystem, notifications } from '.';
const jsforce: any = require('jsforce');
import klaw = require('klaw');
import { saveConfigFile, readConfigFile } from './configuration';
import { checkConfig, enterCredentials } from './credentials';
import { SFDX } from '.';
import { FCCancellationToken } from '../commands/forcecodeCommand';

export const REFRESH_EVENT_NAME: string = 'refreshConns';

export class FCConnectionService implements vscode.TreeDataProvider<FCConnection> {
  private static instance: FCConnectionService;
  private _onDidChangeTreeData: vscode.EventEmitter<
    FCConnection | undefined
  > = new vscode.EventEmitter<FCConnection | undefined>();
  private loggingIn: boolean = false;
  private refreshingConns: boolean = false;

  public readonly onDidChangeTreeData: vscode.Event<FCConnection | undefined> = this
    ._onDidChangeTreeData.event;
  public currentConnection: FCConnection | undefined;
  public connections: FCConnection[];

  public constructor() {
    notifications.writeLog('Starting connection service...');
    this.connections = [];
  }

  public static getInstance() {
    if (!FCConnectionService.instance) {
      FCConnectionService.instance = new FCConnectionService();
    }
    return FCConnectionService.instance;
  }

  public getTreeItem(element: FCConnection): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: FCConnection): FCConnection[] {
    if (!element) {
      // This is the root node
      return this.connections;
    }

    return [];
  }

  public getParent(element: FCConnection): any {
    return null; // this is the parent
  }

  public refreshConnsStatus() {
    if (this.connections) {
      this.connections.forEach(conn => {
        conn.showConnection();
      });
      this.connections.sort(this.sortFunc);
      this._onDidChangeTreeData.fire();
    }
  }

  public isLoggedIn(): boolean {
    const loggedIn: boolean =
      this.currentConnection !== undefined &&
      this.currentConnection.connection !== undefined &&
      vscode.window.forceCode.conn &&
      this.currentConnection.isLoggedIn;
    if (loggedIn) {
      vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', true);
    } else {
      vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', false);
    }
    return loggedIn;
  }

  public getSavedUsernames(): Promise<string[]> {
    return new Promise(resolve => {
      var usernames: string[] = [];
      var fcPath: string = path.join(vscode.window.forceCode.workspaceRoot, '.forceCode');
      if (fs.existsSync(fcPath)) {
        klaw(fcPath, { depthLimit: 0 })
          .on('data', function(file) {
            if (file.stats.isDirectory()) {
              var fileName: string | undefined = file.path.split(path.sep).pop();
              if (fileName && fileName.indexOf('@') > 0) {
                usernames.push(fileName);
              }
            }
          })
          .on('end', function() {
            resolve(usernames);
          })
          .on('error', (err, item) => {
            notifications.writeLog(
              `ForceCode: Error reading ${item.path}. Message: ${err.message}`
            );
          });
      } else {
        resolve(usernames);
      }
    });
  }

  public refreshConnections(): Promise<boolean> {
    if (!this.refreshingConns) {
      this.refreshingConns = true;
      return dxService.orgList().then(orgs => {
        return this.getSavedUsernames().then(uNames => {
          uNames.forEach(uName => {
            this.addConnection({ username: uName });
          });
          if (orgs) {
            const showOnlyProjectOrgs: boolean = vscode.workspace.getConfiguration('force')[
              'onlyShowProjectUsernames'
            ];
            if (showOnlyProjectOrgs) {
              orgs = orgs.filter(currentOrg => uNames.includes(currentOrg.username || ''));
            }
            orgs.forEach(curOrg => {
              this.addConnection(curOrg);
            });
          }
          // tell the connections to refresh their text/icons
          this.refreshConnsStatus();
          notifications.writeLog('Orgs refreshed');
          this.refreshingConns = false;
          return true;
        });
      });
    } else {
      return Promise.resolve(true);
    }
  }

  // this is a check that will refresh the orgs and check if logged in. if not, it asks to log in
  public checkLoginStatus(reason: any, cancellationToken: FCCancellationToken): Promise<boolean> {
    const message = reason && reason.message ? reason.message : reason;
    return this.refreshConnections().then(() => {
      if (
        !this.isLoggedIn() ||
        (message && message.indexOf('expired access/refresh token') !== -1)
      ) {
        if (this.currentConnection) {
          this.currentConnection.isLoggedIn = false;
        }
        return this.connect(
          this.currentConnection ? this.currentConnection.orgInfo : undefined,
          cancellationToken
        );
      } else {
        return true;
      }
    });
  }

  public connect(
    orgInfo: FCOauth | SFDX | undefined,
    cancellationToken: FCCancellationToken
  ): Promise<boolean> {
    if (!this.loggingIn) {
      this.loggingIn = true;
      var username: string | undefined;
      if (orgInfo) {
        username = orgInfo.username;
      }
      return this.setupConn(this, username, cancellationToken)
        .then(res => {
          return this.login(this, res).then(loginRes => {
            return vscode.window.forceCode.connect().then(() => {
              return loginRes;
            });
          });
        })
        .catch(() => {
          return false;
        })
        .then(finalRes => {
          this.loggingIn = false;
          return finalRes;
        });
    } else {
      return Promise.resolve(false);
    }
  }

  private setupConn(
    service: FCConnectionService,
    username: string | undefined,
    cancellationToken: FCCancellationToken
  ): Promise<boolean> {
    service.currentConnection = service.getConnByUsername(username);
    if (!service.isLoggedIn()) {
      return dxService
        .getOrgInfo(username)
        .catch(() => {
          if (service.currentConnection) {
            service.currentConnection.connection = undefined;
          }
          return enterCredentials(cancellationToken);
        })
        .then(orgInf => {
          service.currentConnection = service.addConnection(orgInf, true);
          if (!service.currentConnection) {
            return Promise.reject('Error setting up connection');
          }
          vscode.window.forceCode.config = readConfigFile(orgInf.username);

          const sfdxPath = path.join(
            operatingSystem.getHomeDir(),
            '.sfdx',
            orgInf.username + '.json'
          );
          const refreshToken: string = fs.readJsonSync(sfdxPath).refreshToken;
          service.currentConnection.connection = new jsforce.Connection({
            oauth2: {
              clientId:
                service.currentConnection.orgInfo.clientId || 'SalesforceDevelopmentExperience',
            },
            instanceUrl: service.currentConnection.orgInfo.instanceUrl,
            accessToken: service.currentConnection.orgInfo.accessToken,
            refreshToken: refreshToken,
            version:
              vscode.window.forceCode &&
              vscode.window.forceCode.config &&
              vscode.window.forceCode.config.apiVersion
                ? vscode.window.forceCode.config.apiVersion
                : vscode.workspace.getConfiguration('force')['defaultApiVersion'],
          });

          if (service.currentConnection.connection) {
            return service.currentConnection.connection.identity().then((res: any) => {
              if (!service.currentConnection) {
                return Promise.reject('Error setting up connection');
              }
              service.currentConnection.orgInfo.userId = res.user_id;
              service.currentConnection.isLoggedIn = true;
              vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', true);
              return Promise.resolve(false);
            });
          }
        });
    } else {
      vscode.window.forceCode.config = readConfigFile(username);
      return Promise.resolve(true);
    }
  }

  private login(service: FCConnectionService, hadToLogIn: boolean): Promise<boolean> {
    vscode.window.forceCode.containerAsyncRequestId = undefined;
    vscode.window.forceCode.containerId = undefined;
    vscode.window.forceCode.containerMembers = [];
    return checkConfig(vscode.window.forceCode.config).then(config => {
      saveConfigFile(config.username, config);
      if (!service.currentConnection || !service.currentConnection.connection) {
        return Promise.reject('Error setting up connection');
      }
      vscode.window.forceCode.conn = service.currentConnection.connection;

      // writing to force.json will trigger the file watcher. this, in turn, will call configuration()
      // which will finish setting up the login process
      fs.outputFileSync(
        path.join(vscode.window.forceCode.workspaceRoot, 'force.json'),
        JSON.stringify({ lastUsername: config.username }, undefined, 4)
      );
      return Promise.resolve(hadToLogIn);
    });
  }

  public disconnect(conn: FCConnection | undefined): Promise<any> {
    if (!conn) {
      return Promise.resolve();
    }
    const connIndex: number = this.getConnIndex(conn.orgInfo.username);
    if (connIndex !== -1) {
      const conn: FCConnection = this.connections.splice(connIndex, 1)[0];
      return conn.disconnect();
    } else {
      return Promise.resolve();
    }
  }

  public getConnByUsername(userName: string | undefined): FCConnection | undefined {
    const index: number = this.getConnIndex(userName);
    if (index !== -1) {
      return this.connections[index];
    }
    return undefined;
  }

  public addConnection(
    orgInfo: FCOauth | SFDX | undefined,
    saveToken?: boolean
  ): FCConnection | undefined {
    if (orgInfo && orgInfo.username) {
      var connIndex: number = this.getConnIndex(orgInfo.username);
      if (connIndex === -1) {
        connIndex = this.connections.push(new FCConnection(this, orgInfo)) - 1;
      } else {
        const aToken: string | undefined = this.connections[connIndex].orgInfo.accessToken;
        Object.assign(this.connections[connIndex].orgInfo, orgInfo);
        // only the getOrgInfo command gives us the right access token, for some reason the others don't work
        if (!saveToken) {
          this.connections[connIndex].orgInfo.accessToken = aToken;
        }
      }
      this.connections[connIndex].isLoggedIn =
        !orgInfo.isExpired &&
        (orgInfo.connectedStatus === 'Connected' || orgInfo.connectedStatus === 'Unknown');
      return this.connections[connIndex];
    } else {
      return undefined;
    }
  }

  public getConnIndex(username: string | undefined): number {
    return this.connections.findIndex(cur => {
      return cur.orgInfo.username === username;
    });
  }

  private sortFunc(a: FCConnection, b: FCConnection): number {
    var aStr = a.label ? a.label.toUpperCase() : '';
    var bStr = b.label ? b.label.toUpperCase() : '';
    return aStr.localeCompare(bStr);
  }
}
