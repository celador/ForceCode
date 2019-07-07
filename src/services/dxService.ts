import * as vscode from 'vscode';
import { fcConnection, FCOauth } from '.';
import { exec, ExecOptions } from 'child_process';
import { FCCancellationToken } from '../commands/forcecodeCommand';
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
  private runCommand(
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

    if (!fullCommand.includes('--json')) {
      fullCommand += ' --json';
    }

    const spawnOpt: ExecOptions = {
      // Always use json in stdout
      env: Object.assign({ SFDX_JSON_TO_STDOUT: 'true' }, process.env),
    };

    var pid;
    var sfdxNotFound = false;

    return new Promise((resolve, reject) => {
      const cmd = exec(fullCommand, spawnOpt, function(error, stdout, stderr) {
        let json;
        try {
          json = JSON.parse(stdout);
        } catch (e) {
          console.warn(`No parsable results from command "${fullCommand}"`);
        }
        const theErr = (stderr ? stderr.toLowerCase() : '');
        sfdxNotFound =
          theErr.indexOf('not found') > -1 ||
          theErr.indexOf('not recognized') > -1 ||
          (error ? error.message.indexOf('ENOENT') > -1 : false);
        if (sfdxNotFound) {
          // show the user a message that the SFDX CLI isn't installed
          vscode.window.showErrorMessage(
            'ForceCode: The SFDX CLI could not be found. Please download from [https://developer.salesforce.com/tools/sfdxcli](https://developer.salesforce.com/tools/sfdxcli) and install, then restart Visual Studio Code.'
          );
        }
        // We want to resolve if there's an error with parsable results
        const code = error ? (error.code ? error.code : 0) : 0;
        if ((code > 0 && !json) || (json && json.status > 0 && !json.result)) {
          // Get non-promise stack for extra help
          console.warn(theErr);
          console.warn(error);
          return reject(error);
        } else {
          return resolve(json ? json.result : undefined);
        }
      });
      if (cmd === null || cmd.stdout === null || cmd.stderr === null) {
        return reject();
      } else {
        if (cancellationToken) {
          pid = cmd.pid;
          cancellationToken.cancellationEmitter.on('cancelled', killPromise);
        }
      }
    });

    async function killPromise() {
      console.log('Cancelling task...');
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
      theLogId += '--logid ' + logid;
    }
    return this.runCommand('apex:log:get ' + theLogId, true).then(log => {
      return Promise.resolve(log.log);
    });
  }

  public getAndShowLog(id: string | undefined): Thenable<vscode.TextEditor | undefined> {
    if (!id) {
      id = 'debugLog';
    }
    return vscode.workspace
      .openTextDocument(vscode.Uri.parse(`sflog://salesforce.com/${id}.log?q=${new Date()}`))
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
