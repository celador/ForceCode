import * as vscode from 'vscode';
import { fcConnection, FCOauth } from '.';
import { isWindows } from './operatingSystem';
import { SpawnOptions, spawn } from 'child_process';

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

export interface DXCommands {
  login(url: string): Promise<any>;
  getOrgInfo(username: string): Promise<SFDX>;
  getDebugLog(logid?: string): Promise<string>;
  getAndShowLog(id?: string): Thenable<vscode.TextEditor | undefined>;
  execAnon(file: string): Promise<ExecuteAnonymousResult>;
  openOrg(): Promise<any>;
  openOrgPage(url: string): Promise<any>;
  orgList(): Promise<FCOauth[]>;
  createScratchOrg(edition: string): Promise<any>;
  runTest(classOrMethodName: string, classOrMethod: string): Promise<any>;
  describeGlobal(type: SObjectCategory): Promise<string[]>;
}

export default class DXService implements DXCommands {
  private static instance: DXService;

  public static getInstance() {
    if (!DXService.instance) {
      DXService.instance = new DXService();
    }
    return DXService.instance;
  }

  /*
   *   This does all the work. It will run a cli command through the built in dx.
   *   Takes a command as an argument and a string for the command's arguments.
   */
  private runCommand(cmdString: string, targetusername: boolean): Promise<any> {
    var fullCommand =
      'sfdx force:' +
      cmdString +
      (targetusername && fcConnection.currentConnection
        ? ' --targetusername ' + fcConnection.currentConnection.orgInfo.username
        : '');

    // TODO: get rid of debug console lines
    console.log(fullCommand);
    if (isWindows()) {
      fullCommand = 'cmd /c' + fullCommand;
    }
    const error = new Error(); // Get stack here to use for later

    if (!fullCommand.includes('--json')) {
      fullCommand += ' --json';
    }

    const parts = fullCommand.split(' ');
    const commandName = parts[0];
    const args = parts.slice(1);

    const spawnOpt: SpawnOptions = {
      // Always use json in stdout
      env: Object.assign({ SFDX_JSON_TO_STDOUT: 'true' }, process.env),
    };

    return new Promise((resolve, reject) => {
      const cmd = spawn(commandName, args, spawnOpt);
      if (cmd === null || cmd.stdout === null || cmd.stderr === null) {
        return reject();
      } else {
        let stdout = '';
        cmd.stdout.on('data', data => {
          stdout += data;
        });

        cmd.stderr.on('data', data => {
          console.warn('srderr', data);
        });

        cmd.on('error', data => {
          console.error('err', data);
        });

        cmd.on('close', code => {
          let json;
          try {
            json = JSON.parse(stdout);
          } catch (e) {
            console.warn(`No parsable results from command "${fullCommand}"`);
          }
          if (code > 0) {
            // Get non-promise stack for extra help
            console.warn(error);
            reject(error);
          } else {
            console.log(json.result);
            resolve(json.result);
          }
        });
      }
    });
  }

  public execAnon(file: string): Promise<ExecuteAnonymousResult> {
    return this.runCommand('apex:execute --apexcodefile ' + file, true);
  }

  public login(url: string | undefined): Promise<any> {
    return this.runCommand('auth:web:login --instanceurl ' + url, false);
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

  public getDebugLog(logid?: string): Promise<string> {
    var theLogId: string = '';
    if (logid) {
      theLogId += '--logid ' + logid;
    }
    return this.runCommand('apex:log:get ' + theLogId, true).then(log => {
      return Promise.resolve(log.log);
    });
  }

  public getAndShowLog(id?: string): Thenable<vscode.TextEditor | undefined> {
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
    return this.runCommand('org:open -p ' + url, true);
  }

  public createScratchOrg(options: string): Promise<any> {
    const curConnection = fcConnection.currentConnection;
    if (curConnection) {
      return this.runCommand(
        'org:create ' + options + ' --targetdevhubusername ' + curConnection.orgInfo.username,
        false
      );
    } else {
      return Promise.reject('Forcecode is not currently connected to an org');
    }
  }

  public runTest(classOrMethodName: string, classOrMethod: string): Promise<any> {
    var toRun: string;
    if (classOrMethod === 'class') {
      toRun = '-n ' + classOrMethodName;
    } else {
      toRun = '-t ' + classOrMethodName;
    }

    return this.runCommand('apex:test:run ' + toRun + ' -w 3 -y', true);
  }

  public describeGlobal(type: SObjectCategory): Promise<string[]> {
    return this.runCommand('schema:sobject:list --sobjecttypecategory ' + type.toString(), true);
  }
}
