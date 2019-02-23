import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { fcConnection, FCOauth } from '.';
import alm = require('salesforce-alm');
import { outputToString } from '../parsers/output';

export interface SFDX {
  username: string;
  id: string;
  connectedStatus: string;
  accessToken: string;
  instanceUrl: string;
  clientId: string;
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

interface Topic {
  name: string;
  description: string;
  hidden: boolean;
  commands: Command[];
}

interface Context {
  topic: Topic;
  command: Command;
  flags: {};
}

interface Flag {
  default: string;
  description: string;
  hasValue: boolean;
  hidden: boolean;
  longDescription: string;
  name: string;
  required: boolean;
  type: string;
  char: string;
}

export interface Command {
  command: string;
  description: string;
  flags: Flag[];
  help: string;
  longDescription: string;
  requiresWorkspace: boolean;
  run: (ctx: any) => Promise<any>;
  supportsTargetDevHubUsername: boolean;
  supportsTargetUsername: boolean;
  topic: string;
  usage: string;
}

export interface QueryResult {
  done: boolean; // Flag if the query is fetched all records or not
  nextRecordsUrl?: string; // URL locator for next record set, (available when done = false)
  totalSize: number; // Total size for query
  locator: string; // Total size for query
  records: Array<any>; // Array of records fetched
}

export interface DXCommands {
  getCommand(cmd: string): Command;
  runCommand(cmdString: string, arg: string): Promise<any>;
  login(url: string): Promise<any>;
  //logout(username: string): Promise<any>;
  getOrgInfo(username: string): Promise<SFDX>;
  isEmptyUndOrNull(param: any): boolean;
  getDebugLog(logid?: string): Promise<string>;
  saveToFile(data: any, fileName: string): Promise<string>;
  getAndShowLog(id?: string);
  execAnon(file: string): Promise<ExecuteAnonymousResult>;
  removeFile(fileName: string): Promise<any>;
  openOrg(): Promise<any>;
  openOrgPage(url: string): Promise<any>;
  orgList(): Promise<FCOauth[]>;
  createScratchOrg(edition: string): Promise<any>;
}

export default class DXService implements DXCommands {
  private static instance: DXService;

  public static getInstance() {
    if (!DXService.instance) {
      DXService.instance = new DXService();
    }
    return DXService.instance;
  }

  public getCommand(cmd: string): Command {
    return alm.commands.filter(c => {
      return c.topic + ':' + c.command === cmd;
    })[0];
  }

  public isEmptyUndOrNull(param: any): boolean {
    return (
      param == undefined ||
      param == null ||
      (Array.isArray(param) && param.length === 0) ||
      Object.keys(param).length === 0
    );
  }

  public saveToFile(data: any, fileName: string): Promise<string> {
    try {
      fs.outputFileSync(vscode.window.forceCode.projectRoot + path.sep + fileName, data);
      return Promise.resolve(vscode.window.forceCode.projectRoot + path.sep + fileName);
    } catch (e) {
      return Promise.reject(undefined);
    }
  }

  public removeFile(fileName: string): Promise<any> {
    try {
      fs.removeSync(vscode.window.forceCode.projectRoot + path.sep + fileName);
      return Promise.resolve(undefined);
    } catch (e) {
      return Promise.reject(undefined);
    }
  }

  /*
   *   This does all the work. It will run a cli command through the built in dx.
   *   Takes a command as an argument and a string for the command's arguments.
   */
  public runCommand(cmdString: string, arg: string): Promise<any> {
    arg += ' --json';
    var cmd: Command = this.getCommand(cmdString);
    var topic: Topic = alm.topics.filter(t => {
      return t.name === cmd.topic;
    })[0];

    var cliContext: Context = {
      command: cmd,
      topic: topic,
      flags: {},
    };

    if (arg !== undefined && arg !== '') {
      // this helps solve a bug when we have '-' in commands and queries and stuff
      arg = ' ' + arg;
      var replaceString: string = undefined;
      do {
        replaceString = '}@FC$' + Date.now() + '$FC@{';
      } while (arg.includes(replaceString));
      arg = arg.replace(/\s--/gm, replaceString).replace(/\s-/gm, replaceString);
      var theArgsArray = arg.trim().split(replaceString);
      theArgsArray.forEach(function(i) {
        if (i.length > 0) {
          var curCmd = new Array();
          curCmd = i.trim().split(' ');
          var commandName = curCmd.shift();
          if (commandName.length === 1) {
            // this means we need to search for the argument name
            commandName = cmd.flags.find(fl => {
              return fl.char === commandName;
            }).name;
          }
          if (curCmd.length > 0) cliContext.flags[commandName] = curCmd.join(' ').trim();
          else cliContext.flags[commandName] = true;
        }
      });
    }
    // add in targetusername so we can stay logged in
    if (
      cmd.supportsTargetUsername &&
      cliContext.flags['targetusername'] === undefined &&
      cmdString !== 'auth:web:login' &&
      fcConnection.currentConnection
    ) {
      cliContext.flags['targetusername'] = fcConnection.currentConnection.orgInfo.username;
    }
    // get error output from SFDX
    var errlog;
    var oldConsole = console.log;
    console.log = getErrLog;
    return cmd.run(cliContext).then(res => {
      console.log = oldConsole;
      if (!this.isEmptyUndOrNull(res)) {
        return res;
      }
      try {
        console.log(errlog);
        errlog = JSON.parse(errlog);
        errlog = errlog.message ? errlog.message : errlog;
      } catch (e) {}
      return Promise.reject(
        errlog || 'Failed to execute command: ' + cmdString + outputToString(theArgsArray)
      );
    });

    function getErrLog(data) {
      errlog = data;
    }
  }

  public execAnon(file: string): Promise<ExecuteAnonymousResult> {
    return this.runCommand('apex:execute', '--apexcodefile ' + file);
  }

  public login(url: string): Promise<any> {
    return this.runCommand('auth:web:login', '--instanceurl ' + url);
  }

  // this command isn't working so for now get rid of it
  /*
    public logout(username: string): Promise<any> {
        const conn: FCConnection = fcConnection.getConnByUsername(username);
        if(conn && conn.isLoggedIn) {
            return Promise.resolve(this.runCommand('auth:logout', '--noprompt --targetusername ' + username));
        } else {
            return Promise.resolve();
        }
    }
    */

  public getOrgInfo(username: string): Promise<SFDX> {
    return this.runCommand('org:display', '--targetusername ' + username);
  }

  public orgList(): Promise<FCOauth[]> {
    return this.runCommand('org:list', '--clean --noprompt')
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
    return this.runCommand('apex:log:get', theLogId).then(log => {
      return Promise.resolve(log.log);
    });
  }

  public getAndShowLog(id?: string) {
    if (!id) {
      id = 'debugLog';
    }
    return vscode.workspace
      .openTextDocument(vscode.Uri.parse(`sflog://salesforce.com/${id}.log?q=${new Date()}`))
      .then(function(_document: vscode.TextDocument) {
        if (_document.getText() !== '') {
          return vscode.window.showTextDocument(_document, 3, true);
        }
        return undefined;
      });
  }

  public openOrg(): Promise<any> {
    return this.runCommand('org:open', '');
  }

  public openOrgPage(url: string): Promise<any> {
    return this.runCommand('org:open', '-p ' + url);
  }

  public createScratchOrg(options: string): Promise<any> {
    return this.runCommand(
      'org:create',
      options + ' --targetdevhubusername ' + fcConnection.currentConnection.orgInfo.username
    );
  }
}
