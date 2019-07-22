import * as vscode from 'vscode';
import { fcConnection, FCOauth, notifications } from '.';
import { isWindows } from './operatingSystem';
import { SpawnOptions, spawn } from 'child_process';
import { FCCancellationToken } from '../commands/forcecodeCommand';
import { inDebug } from './fcAnalytics';
const kill = require('tree-kill');

export interface SFDX {
  username: string;
  id: string;
  connectedStatus: string;
  accessToken: string;
  instanceUrl: string;
  clientId: string;
  isExpired?: boolean;
  userId?: string;
  isDevHub?: boolean;
}

export interface ExecuteAnonymousResult {
  compiled: boolean;
  compileProblem: string;
  success: boolean;
  line: number;
  column: number;
  exceptionMessage: string;
  exceptionStackTrace: string;
  logs: string;
}

interface ApexTestResult {
  StackTrace: string;
  Message: string;
  ApexClass: {
    Id: string;
  };
}

export interface ApexTestQueryResult {
  done: boolean; // Flag if the query is fetched all records or not
  nextRecordsUrl?: string; // URL locator for next record set, (available when done = false)
  totalSize: number; // Total size for query
  locator: string; // Total size for query
  records: Array<any>; // Array of records fetched
  summary: any;
  tests: ApexTestResult[];
}

export enum SObjectCategory {
  ALL = 'ALL',
  STANDARD = 'STANDARD',
  CUSTOM = 'CUSTOM',
}

export default class DXService {
  private static instance: DXService;

  public static getInstance() {
    if (!DXService.instance) {
      DXService.instance = new DXService();
    }
    return DXService.instance;
  }

  /*
   *   This does all the work. It will run a cli command through the shell.
   *   Takes a string for the command and the command's arguments.
   */
  public runCommand(
    cmdString: string,
    targetusername: boolean,
    cancellationToken?: FCCancellationToken
  ): Promise<any> {
    var fullCommand =
      'sfdx force:' +
      cmdString +
      (targetusername && fcConnection.currentConnection
        ? ' --targetusername ' + fcConnection.currentConnection.orgInfo.username
        : '');

    if (isWindows()) {
      fullCommand = 'cmd /c ' + fullCommand;
    }
    const error = new Error(); // Get stack here to use for later

    if (!fullCommand.includes('--json')) {
      fullCommand += ' --json';
    }

    const parts = fullCommand.split(' ');
    const commandName = parts[0];
    const args = parts.slice(1).map(arg => {
      return arg.split('#FC*SPACE*#').join(' ');
    });

    const spawnOpt: SpawnOptions = {
      // Always use json in stdout
      env: Object.assign({ SFDX_JSON_TO_STDOUT: 'true' }, process.env),
    };

    var pid;
    var sfdxNotFound = false;

    return new Promise((resolve, reject) => {
      const cmd = spawn(commandName, args, spawnOpt);
      if (cmd === null || cmd.stdout === null || cmd.stderr === null) {
        return reject();
      } else {
        if (cancellationToken) {
          pid = cmd.pid;
          cancellationToken.cancellationEmitter.on('cancelled', killPromise);
        }
        let stdout = '';
        cmd.stdout.on('data', data => {
          stdout += data;
        });

        cmd.stderr.on('data', data => {
          var theErr: string = data.toString();
          notifications.writeLog(theErr);
          if (theErr) {
            theErr = theErr.toLowerCase();
            sfdxNotFound =
              theErr.indexOf('not found') > -1 || theErr.indexOf('not recognized') > -1;
          }
        });

        cmd.on('error', data => {
          notifications.writeLog(data);
          sfdxNotFound = data.message.indexOf('ENOENT') > -1;
        });

        cmd.on('close', code => {
          let json;
          try {
            json = JSON.parse(stdout);
          } catch (e) {
            notifications.writeLog(`No parsable results from command "${fullCommand}"`);
          }
          if (sfdxNotFound) {
            // show the user a message that the SFDX CLI isn't installed
            notifications.showError(
              'ForceCode: The SFDX CLI could not be found. Please download from [https://developer.salesforce.com/tools/sfdxcli](https://developer.salesforce.com/tools/sfdxcli) and install, then restart Visual Studio Code.'
            );
          }
          // We want to resolve if there's an error with parsable results
          if ((code > 0 && !json) || (json && json.status > 0 && !json.result)) {
            // Get non-promise stack for extra help
            notifications.writeLog(error);
            notifications.writeLog(json);
            return reject(
              json && json.message ? json.message : error && error.message ? error.message : error
            );
          } else {
            return resolve(json ? json.result : undefined);
          }
        });
      }
    });

    async function killPromise() {
      notifications.writeLog('Cancelling task...');
      return new Promise((resolve, reject) => {
        kill(pid, 'SIGKILL', (err: {}) => {
          err ? reject(err) : resolve();
        });
      });
    }
  }

  public execAnon(
    file: string,
    cancellationToken: FCCancellationToken
  ): Promise<ExecuteAnonymousResult> {
    file = file.split(' ').join('#FC*SPACE*#');
    return this.runCommand('apex:execute --apexcodefile ' + file, true, cancellationToken);
  }

  public login(url: string | undefined, cancellationToken: FCCancellationToken): Promise<any> {
    return this.runCommand('auth:web:login --instanceurl ' + url, false, cancellationToken);
  }

  public getOrgInfo(username: string | undefined): Promise<SFDX> {
    return this.runCommand('org:display --targetusername ' + username, false);
  }

  public orgList(): Promise<FCOauth[]> {
    return this.runCommand('org:list --clean --noprompt', false)
      .then(res => {
        return res.nonScratchOrgs.concat(res.scratchOrgs);
      })
      .catch(() => {
        // we got an error because there are no connections
        fcConnection.getChildren().forEach(curConn => {
          curConn.isLoggedIn = false;
        });
        return undefined;
      });
  }

  public getDebugLog(logid: string | undefined): Promise<string> {
    var theLogId: string = '';
    if (logid) {
      theLogId += ' --logid ' + logid;
    }
    return this.runCommand('apex:log:get' + theLogId, true).then(log => {
      log = log[0] ? log[0] : log;
      return Promise.resolve(log.log);
    });
  }

  public getAndShowLog(id: string | undefined): Thenable<vscode.TextEditor | undefined> {
    if (!id) {
      id = 'debugLog';
    }
    return vscode.workspace
      .openTextDocument(
        vscode.Uri.parse(`sflog://salesforce.com/${new Date().toISOString()}.log?q=${id}`)
      )
      .then(function(_document: vscode.TextDocument) {
        if (_document.getText() !== '') {
          return vscode.window.showTextDocument(_document, 3, true);
        } else {
          return {
            async then(callback) {
              return callback(undefined);
            },
          };
        }
      });
  }

  public openOrg(): Promise<any> {
    return this.runCommand('org:open', true);
  }

  public openOrgPage(url: string): Promise<any> {
    return this.runCommand('org:open -p ' + encodeURIComponent(url), true);
  }

  public createScratchOrg(options: string, cancellationToken: FCCancellationToken): Promise<any> {
    const curConnection = fcConnection.currentConnection;
    if (curConnection) {
      // TODO: Fix stubbing the call to create scratch org
      if (inDebug()) {
        return Promise.resolve({
          orgId: '00D1N00000AAAAAAAA',
          username: 'test@test.com',
        });
      }
      return this.runCommand(
        'org:create ' + options + ' --targetdevhubusername ' + curConnection.orgInfo.username,
        false,
        cancellationToken
      );
    } else {
      return Promise.reject('Forcecode is not currently connected to an org');
    }
  }

  public runTest(
    classOrMethodName: string,
    classOrMethod: string,
    cancellationToken: FCCancellationToken
  ): Promise<any> {
    var toRun: string;
    if (classOrMethod === 'class') {
      toRun = '-n ' + classOrMethodName;
    } else {
      toRun = '-t ' + classOrMethodName;
    }

    return this.runCommand('apex:test:run ' + toRun + ' -w 3 -y', true, cancellationToken);
  }

  public describeGlobal(type: SObjectCategory): Promise<string[]> {
    return this.runCommand('schema:sobject:list --sobjecttypecategory ' + type.toString(), true);
  }
}
