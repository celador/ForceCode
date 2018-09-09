import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { switchUserViewService, commandService, operatingSystem} from '.';
import { FCOauth } from './switchUserView';
var alm: any = require('salesforce-alm');

export interface OrgListResult {
    orgs: FCOauth[]
}

export interface SFDX {
    username: string,
    id: string,
    connectedStatus: string,
    accessToken: string,
    instanceUrl: string,
    clientId: string,
}

export interface ExecuteAnonymousResult {
    compiled: boolean,
    compileProblem: string,
    success: boolean,
    line: number,
    column: number,
    exceptionMessage: string,
    exceptionStackTrace: string,
    logs: string
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
    outputToString(toConvert: any, depth?: number): string;
    runCommand(cmdString: string, arg: string): Promise<any>;
    login(url: string): Promise<any>;
    logout(): Promise<any>;
    getOrgInfo(): Promise<SFDX>;
    isEmptyUndOrNull(param: any): boolean;
    getDebugLog(logid?: string): Promise<string>;
    saveToFile(data: any, fileName: string): Promise<string>;
    getAndShowLog(id?: string);
    execAnon(file: string): Promise<ExecuteAnonymousResult>;
    removeFile(fileName: string): Promise<any>;
    openOrg(): Promise<any>;
    openOrgPage(url: string): Promise<any>;
    orgList(): Promise<OrgListResult>;
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
            return (c.topic + ':' + c.command) === cmd;
        })[0];
    }

    public outputToString(toConvert: any, depth?: number): string {
        if(toConvert === undefined || toConvert === null)
        {
            return '';
        }
        var retval: string;
        if(typeof toConvert === 'object') {
            var level: number = depth ? depth : 1;
            var tabs: string = '';
            var brTabs: string = '';
            for(var theTabs = 0; theTabs < level; theTabs++)
            {
                tabs += '\t';
                if(theTabs + 1 < level) {
                    brTabs += '\t';
                }
            }
            retval = '\n' + brTabs + '{\n';
            level++;
            Object.keys(toConvert).forEach(key => {
                retval += tabs + key + ': ' + this.outputToString(toConvert[key], level) + ',\n';
            });
            level--;
            retval += brTabs + '}';
        } else {
            retval = toConvert;
        }
        return retval;
    }

    public isEmptyUndOrNull(param: any): boolean { 
        return (param === undefined || param === null || Object.keys(param).length === 0)
    }

    public saveToFile(data: any, fileName: string): Promise<string> {
        try{
            fs.outputFileSync(vscode.window.forceCode.workspaceRoot + path.sep + fileName, data);
            return Promise.resolve(vscode.window.forceCode.workspaceRoot + path.sep + fileName);
        } catch(e) {
            return Promise.reject(undefined);
        }
    }

    public removeFile(fileName: string): Promise<any> {
        try{
            fs.removeSync(vscode.window.forceCode.workspaceRoot + path.sep + fileName);
            return Promise.resolve(undefined);
        } catch(e) {
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
            flags: {}
        };

        if(arg !== undefined && arg !== '') {
            // this helps solve a bug when we have '-' in commands and queries and stuff
            arg = ' ' + arg;
            var replaceString: string = undefined;
            do {
                replaceString = '}@FC$' + Date.now() + '$FC@{';
            } while(arg.includes(replaceString));
            arg = arg.replace(/\s--/gm, replaceString).replace(/\s-/gm, replaceString);
            var theArgsArray = arg.trim().split(replaceString); 
            theArgsArray.forEach(function(i) {
                if(i.length > 0) {
                    var curCmd = new Array();
                    curCmd = i.trim().split(' ');
                    var commandName = curCmd.shift();
                    if(commandName.length === 1) {
                        // this means we need to search for the argument name
                        commandName = cmd.flags.find(fl => { return fl.char === commandName; }).name;
                    }
                    if(curCmd.length > 0)
                        cliContext.flags[commandName] = curCmd.join(' ').trim();
                    else
                        cliContext.flags[commandName] = true;
                }
            });
        }
        // add in targetusername so we can stay logged in
        if(cliContext.flags['targetusername'] === undefined && switchUserViewService.orgInfo.username !== undefined && cmd.flags.find(fl => { return fl.name === 'targetusername' }) !== undefined) {
            cliContext.flags['targetusername'] = switchUserViewService.orgInfo.username;
        } 
        return cmd.run(cliContext).then(res => {
            if(!this.isEmptyUndOrNull(res)) {
                return res;
            }
            return Promise.reject('Failed to execute command: ' + cmdString + this.outputToString(theArgsArray));
        });
    }

    public execAnon(file: string): Promise<ExecuteAnonymousResult> {
        return this.runCommand('apex:execute', '--apexcodefile ' + file);
    }

    public login(url: string): Promise<any> {
        return this.runCommand('auth:web:login', '--instanceurl ' + url).then(loginRes => {
            switchUserViewService.orgInfo = loginRes;
            vscode.window.forceCode.config.username = loginRes.username;
            return commandService.runCommand('ForceCode.switchUserText', loginRes).then(res => {
                return Promise.resolve(res);
            });
        });
    }

    public logout(): Promise<any> {
        if(switchUserViewService.isLoggedIn()) {
            return Promise.resolve(this.runCommand('auth:logout', '--noprompt')).then(() => {
                vscode.window.forceCode.conn = undefined;   // this will go away soon
                switchUserViewService.orgInfo = {};
                return Promise.resolve(switchUserViewService.refreshOrgs());                  
            });
        } else {
            return Promise.resolve();
        }
    }

    public getOrgInfo(): Promise<SFDX> {
        return this.runCommand('org:display', '').then(res => {
            switchUserViewService.orgInfo = res;
            return Promise.resolve(res);
        }, () => {
            return Promise.reject();
        });
    }

    public orgList(): Promise<OrgListResult> {
        if(switchUserViewService.isLoggedIn()) {
            return this.runCommand('org:list', '--clean').then(res => {
                const orgs: OrgListResult = { orgs: res.nonScratchOrgs.concat(res.scratchOrgs) }
                orgs.orgs.forEach(org => {
                    const sfdxPath: string = path.join(operatingSystem.getHomeDir(), '.sfdx', org.username + '.json');
                    // cleanup if it's not actually connected
                    if(org.connectedStatus !== 'Connected' && fs.existsSync(sfdxPath)) {
                        fs.removeSync(sfdxPath);
                    }
                })
                return orgs;
            });
        }
        return Promise.reject();
    }

    public getDebugLog(logid?: string): Promise<string> {
        var theLogId: string = '';
        if(logid) {
            theLogId += '--logid ' + logid;
        }
        return this.runCommand('apex:log:get', theLogId).then(log => {
            return Promise.resolve(log.log);
        });
    }

    public getAndShowLog(id?: string) {
        if(!id) {
            id = 'debugLog';
        }
        return vscode.workspace.openTextDocument(vscode.Uri.parse(`sflog://salesforce.com/${id}.log?q=${new Date()}`)).then(function (_document: vscode.TextDocument) {
            if(_document.getText() !== '') {  
                return vscode.window.showTextDocument(_document, 3, true);
            }
            return undefined;
        });
    }

    public openOrg(): Promise<any> {
        return this.runCommand('org:open', '');
    }

    public openOrgPage(url: string): Promise<any> {
        return Promise.resolve(this.runCommand('org:open', '-p ' + url));
    }
}