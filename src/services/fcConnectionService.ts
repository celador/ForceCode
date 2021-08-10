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
const jsforce = require('jsforce');
import klaw = require('klaw');
import { FCCancellationToken } from '../commands';
import { VSCODE_SETTINGS } from './configuration';

export class FCConnectionService implements vscode.TreeDataProvider<FCConnection> {
  private static instance: FCConnectionService;
  private _onDidChangeTreeData: vscode.EventEmitter<FCConnection | undefined> =
    new vscode.EventEmitter<FCConnection | undefined>();
  private loggingIn: boolean = false;
  private refreshingConns: boolean = false;

  public readonly onDidChangeTreeData: vscode.Event<FCConnection | undefined> =
    this._onDidChangeTreeData.event;
  public currentConnection: FCConnection | undefined;
  public connections: Map<string, FCConnection>;

  public constructor() {
    notifications.writeLog('Starting connection service...');
    this.connections = new Map<string, FCConnection>();
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
      return Array.from(this.connections.values()).sort(this.sortFunc);
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

  public async refreshConnections(): Promise<boolean> {
    if (!this.refreshingConns) {
      this.refreshingConns = true;
      let orgs = await dxService.orgList();
      const uNames = await this.getSavedUsernames();
      uNames.forEach((uName) => {
        this.addConnection({ username: uName });
      });
      if (orgs) {
        if (getVSCodeSetting(VSCODE_SETTINGS.onlyShowProjectUsernames)) {
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
    }
    return Promise.resolve(true);
  }

  // this is a check that will refresh the orgs and check if logged in. if not, it asks to log in
  public async checkLoginStatus(
    reason: any,
    cancellationToken: FCCancellationToken
  ): Promise<boolean> {
    const message = reason?.message || reason;
    notifications.writeLog('Checking login status: ' + message);
    await this.refreshConnections();
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
      return Promise.resolve(true);
    }
  }

  public async connect(
    orgInfo: FCOauth | SFDX | undefined,
    cancellationToken: FCCancellationToken
  ): Promise<boolean> {
    const service = this;
    let username: string | undefined;

    if (this.loggingIn) {
      return Promise.resolve(false);
    }

    this.loggingIn = true;
    if (orgInfo) {
      username = orgInfo.username;
    }
    let finalRes: any;
    try {
      service.currentConnection = service.getConnByUsername(username);
      finalRes = service.isLoggedIn();
      const connection = await setupConn(finalRes);
      await login(connection);
      await vscode.window.forceCode.connect();
    } catch (err) {
      notifications.writeLog(err);
      finalRes = false;
    }
    this.loggingIn = false;
    return Promise.resolve(finalRes);

    // pretty much this whole function is skipped if a user is logged in already
    async function setupConn(isLoggedIn: boolean): Promise<FCConnection> {
      if (isLoggedIn && service.currentConnection) {
        vscode.window.forceCode.config = readConfigFile(username);
        return Promise.resolve(service.currentConnection);
      }

      let orgInf: FCOauth;
      try {
        orgInf = await dxService.getOrgInfo(username);
      } catch (_error) {
        if (service.currentConnection) {
          service.currentConnection.connection = undefined;
        }
        orgInf = await enterCredentials(cancellationToken);
      }

      service.currentConnection = service.addConnection(orgInf, true);
      if (!service.currentConnection) {
        return Promise.reject('Error setting up connection: setupConn');
      }
      vscode.window.forceCode.config = readConfigFile(orgInf.username);

      const sfdxPath = path.join(getHomeDir(), '.sfdx', orgInf.username + '.json');
      const refreshToken: string = fs.readJsonSync(sfdxPath).refreshToken;
      let connection = new jsforce.Connection({
        oauth2: {
          clientId: service.currentConnection.orgInfo.clientId || 'SalesforceDevelopmentExperience',
        },
        instanceUrl: service.currentConnection.orgInfo.instanceUrl,
        accessToken: service.currentConnection.orgInfo.accessToken,
        refreshToken: refreshToken,
        version:
          vscode.window.forceCode?.config?.apiVersion ||
          getVSCodeSetting(VSCODE_SETTINGS.defaultApiVersion),
      });

      service.currentConnection.connection = connection;

      // get the user id
      const identity = await connection.identity();
      service.currentConnection.orgInfo.userId = identity.user_id;
      service.currentConnection.isLoggedIn = true;
      vscode.commands.executeCommand('setContext', 'ForceCodeLoggedIn', true);

      return Promise.resolve(service.currentConnection);
    }

    async function login(fcConnection: FCConnection): Promise<void> {
      containerService.clear();
      const config = await checkConfig(vscode.window.forceCode.config);
      saveConfigFile(config.username, config);
      if (!fcConnection.connection) {
        return Promise.reject('Error setting up connection: login');
      }
      vscode.window.forceCode.conn = fcConnection.connection;
      // writing to force.json will trigger the file watcher. this, in turn, will call configuration()
      // which will finish setting up the login process
      fs.outputFileSync(
        path.join(vscode.window.forceCode.workspaceRoot, 'force.json'),
        JSON.stringify({ lastUsername: config.username }, undefined, 4)
      );
      vscode.window.forceCode.projectRoot = path.join(
        vscode.window.forceCode.workspaceRoot,
        vscode.window.forceCode.config.src || (config.useSourceFormat ? 'force-app' : 'src')
      );
      const describe = await vscode.window.forceCode.conn.metadata.describe();
      vscode.window.forceCode.describe = describe;
      if (vscode.window.forceCode.config.useSourceFormat) {
        // TODO these types currently aren't supported for whatever reason, but can be retrieved via SFDX and non-source
        // format in ForceCode...so not sure why it doesn't work here as of yet
        let excludeVals = new Set<String>([
          'AIApplication',
          'AIApplicationConfig',
          'MLDataDefinition',
          'MLPredictionDefinition',
        ]);
        vscode.window.forceCode.describe.metadataObjects =
          vscode.window.forceCode.describe.metadataObjects.filter(
            (type) => !excludeVals.has(type.xmlName)
          );
      }
      vscode.window.forceCode.config.prefix = describe.organizationNamespace;
      notifications.writeLog('Done retrieving metadata records');
      return Promise.resolve();
    }
  }

  // END connect() =====================================================================

  public disconnect(conn: FCConnection | undefined): Promise<any> {
    if (!conn) {
      return Promise.resolve();
    }

    if (this.connections.has(conn.orgInfo.username)) {
      this.connections.delete(conn.orgInfo.username);
      return conn.disconnect();
    } else {
      return Promise.resolve();
    }
  }

  public getConnByUsername(userName: string | undefined): FCConnection | undefined {
    return this.connections.get(userName ? userName : '');
  }

  public addConnection(
    orgInfo: FCOauth | SFDX | undefined,
    saveToken?: boolean
  ): FCConnection | undefined {
    if (orgInfo?.username) {
      let fcConn: FCConnection;
      if (!this.connections.has(orgInfo.username)) {
        fcConn = new FCConnection(this, orgInfo);
      } else {
        fcConn = this.connections.get(orgInfo.username)!;
        const aToken: string | undefined = fcConn.orgInfo.accessToken;
        Object.assign(fcConn.orgInfo, orgInfo);
        // only the getOrgInfo command gives us the right access token, for some reason the others don't work
        if (!saveToken) {
          fcConn.orgInfo.accessToken = aToken;
        }
      }
      fcConn.isLoggedIn =
        !orgInfo.isExpired &&
        (orgInfo.connectedStatus === 'Connected' || orgInfo.connectedStatus === 'Unknown');
      this.connections.set(orgInfo.username, fcConn);
      return fcConn;
    } else {
      return undefined;
    }
  }

  private sortFunc(a: FCConnection, b: FCConnection): number {
    let aStr = a.getLabel().toUpperCase() || '';
    let bStr = b.getLabel().toUpperCase() || '';
    return aStr.localeCompare(bStr);
  }
}
