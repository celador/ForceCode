import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import {
  dxService,
  FCOauth,
  FCConnection,
  getHomeDir,
  notifications,
  saveConfigFile,
  readConfigFile,
  SFDX,
  checkConfig,
  enterCredentials,
  getVSCodeSetting,
  containerService,
} from '.';
const jsforce: any = require('jsforce');
import klaw = require('klaw');
import { FCCancellationToken } from '../commands';
import { jsforce, Connection } from 'jsforce';

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

  public getParent(_element: FCConnection): any {
    return null; // this is the parent
  }

  public refreshConnsStatus() {
    if (this.connections) {
      this.connections.forEach((conn) => {
        conn.showConnection();
      });
      this.connections.sort(this.sortFunc);
      this._onDidChangeTreeData.fire(undefined);
    }
  }

  public isLoggedIn(): boolean {
    const loggedIn: boolean =
      vscode.window.forceCode.conn !== undefined &&
      this.currentConnection?.connection !== undefined &&
      this.currentConnection?.isLoggedIn === true;
    if (loggedIn) {
      vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', true);
    } else {
      vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', false);
    }
    return loggedIn;
  }

  public getSavedUsernames(): Promise<string[]> {
    return new Promise((resolve) => {
      let usernames: string[] = [];
      let fcPath: string = path.join(vscode.window.forceCode.workspaceRoot, '.forceCode');
      if (fs.existsSync(fcPath)) {
        klaw(fcPath, { depthLimit: 0 })
          .on('data', function (file) {
            if (file.stats.isDirectory()) {
              let fileName: string | undefined = file.path.split(path.sep).pop();
              if (fileName && fileName.indexOf('@') > 0) {
                usernames.push(fileName);
              }
            }
          })
          .on('end', function () {
            resolve(usernames);
          })
          .on('error', (err: Error, item: klaw.Item) => {
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
      return dxService.orgList().then((orgs) => {
        return this.getSavedUsernames().then((uNames) => {
          uNames.forEach((uName) => {
            this.addConnection({ username: uName });
          });
          if (orgs) {
            const showOnlyProjectOrgs: boolean = getVSCodeSetting('onlyShowProjectUsernames');
            if (showOnlyProjectOrgs) {
              orgs = orgs.filter((currentOrg) => uNames.includes(currentOrg.username || ''));
            }
            orgs.forEach((curOrg) => {
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
    const message = reason?.message || reason;
    notifications.writeLog('Checking login status: ' + message);
    return this.refreshConnections().then(() => {
      if (
        !this.isLoggedIn() ||
        (message &&
          (message.indexOf('expired access/refresh token') !== -1 ||
            message.indexOf('ECONNRESET') !== -1))
      ) {
        if (this.currentConnection) {
          this.currentConnection.isLoggedIn = false;
        }
        return this.connect(this.currentConnection?.orgInfo, cancellationToken);
      } else {
        return true;
      }
    });
  }

  public connect(
    orgInfo: FCOauth | SFDX | undefined,
    cancellationToken: FCCancellationToken
  ): Promise<boolean> {
    const service = this;
    let username: string | undefined;
    if (!this.loggingIn) {
      this.loggingIn = true;
      if (orgInfo) {
        username = orgInfo.username;
      }
      return setupConn()
        .then(login)
        .then((loginRes) => {
          return vscode.window.forceCode.connect().then(() => {
            return loginRes;
          });
        })
        .catch((err) => {
          notifications.writeLog(err);
          return false;
        })
        .then((finalRes) => {
          this.loggingIn = false;
          return finalRes;
        });
    } else {
      return Promise.resolve(false);
    }

    function setupConn(): Promise<boolean> {
      service.currentConnection = service.getConnByUsername(username);

      if (service.isLoggedIn()) {
        vscode.window.forceCode.config = readConfigFile(username);
        return Promise.resolve(true);
      }

      return dxService.getOrgInfo(username).catch(getCredentials).then(setOrgInfo).then(getUserId);
    }

    function getCredentials() {
      if (service.currentConnection) {
        service.currentConnection.connection = undefined;
      }
      return enterCredentials(cancellationToken);
    }

    function setOrgInfo(orgInf: FCOauth | SFDX): Promise<Connection | undefined> {
      service.currentConnection = service.addConnection(orgInf, true);
      if (!service.currentConnection) {
        return Promise.reject('Error setting up connection: setOrgInfo');
      }
      vscode.window.forceCode.config = readConfigFile(orgInf.username);

      const sfdxPath = path.join(getHomeDir(), '.sfdx', orgInf.username + '.json');
      const refreshToken: string = fs.readJsonSync(sfdxPath).refreshToken;
      service.currentConnection.connection = new jsforce.Connection({
        oauth2: {
          clientId: service.currentConnection.orgInfo.clientId || 'SalesforceDevelopmentExperience',
        },
        instanceUrl: service.currentConnection.orgInfo.instanceUrl,
        accessToken: service.currentConnection.orgInfo.accessToken,
        refreshToken: refreshToken,
        version:
          vscode.window.forceCode?.config?.apiVersion || getVSCodeSetting('defaultApiVersion'),
      });

      return Promise.resolve(service.currentConnection.connection);
    }

    function getUserId(connection: Connection | undefined): Promise<boolean> {
      if (connection) {
        return connection.identity().then((res: any) => {
          if (!service.currentConnection) {
            return Promise.reject('Error setting up connection: getUserId1');
          }
          service.currentConnection.orgInfo.userId = res.user_id;
          service.currentConnection.isLoggedIn = true;
          vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', true);
          return Promise.resolve(false);
        });
      } else {
        return Promise.reject('Error setting up connection: getUserId2');
      }
    }

    function login(hadToLogIn: boolean): Promise<boolean> {
      containerService.clear();
      return checkConfig(vscode.window.forceCode.config).then((config) => {
        saveConfigFile(config.username, config);
        if (!service.currentConnection || !service.currentConnection.connection) {
          return Promise.reject('Error setting up connection: login');
        }
        vscode.window.forceCode.conn = service.currentConnection.connection;

        // writing to force.json will trigger the file watcher. this, in turn, will call configuration()
        // which will finish setting up the login process
        fs.outputFileSync(
          path.join(vscode.window.forceCode.workspaceRoot, 'force.json'),
          JSON.stringify({ lastUsername: config.username }, undefined, 4)
        );
        vscode.window.forceCode.projectRoot = path.join(
          vscode.window.forceCode.workspaceRoot,
          vscode.window.forceCode.config.src || 'src'
        );
        return vscode.window.forceCode.conn.metadata.describe().then((res) => {
          vscode.window.forceCode.describe = res;
          vscode.window.forceCode.config.prefix = res.organizationNamespace;
          notifications.writeLog('Done retrieving metadata records');
          return Promise.resolve(hadToLogIn);
        });
      });
    }
  }

  // END connect() =====================================================================

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
    if (orgInfo?.username) {
      let connIndex: number = this.getConnIndex(orgInfo.username);
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
    return this.connections.findIndex((cur) => {
      return cur.orgInfo.username === username;
    });
  }

  private sortFunc(a: FCConnection, b: FCConnection): number {
    let aStr = a.label?.toUpperCase() || '';
    let bStr = b.label?.toUpperCase() || '';
    return aStr.localeCompare(bStr);
  }
}
