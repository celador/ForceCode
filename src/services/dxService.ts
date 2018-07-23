import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { commandService } from '.';
var alm: any = require('salesforce-alm');

export interface SFDX {
    username: string,
    id: string,
    userId: string,
    connectedStatus: string,
    accessToken: string,
    instanceUrl: string,
    clientId: string
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
    name: string; // `json:"name"`
    description: string; // `json:"description"`
    hidden: boolean;   // `json:"hidden"`
    commands: Command[];
}

interface Context {
    topic: Topic;                 // `json:"topic"`
    command: Command;               // `json:"command"`
    flags: {}; // `json:"flags"`
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
    isLoggedIn: boolean;
    orgInfo: SFDX;
    getCommand(cmd: string): Command;
    outputToString(toConvert: any, depth?: number): string;
    runCommand(cmdString: string, arg: string): Promise<any>;
    toqlQuery(query: string): Promise<QueryResult>;
    login(): Promise<any>;
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
}

export default class DXService implements DXCommands {
    public isLoggedIn: boolean = false;
    public orgInfo: SFDX;

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

    public async saveToFile(data: any, fileName: string): Promise<string> {
        try{
            await fs.outputFile(vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep + fileName, data);
            return Promise.resolve(vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep + fileName);
        } catch(e) {
            return Promise.reject(undefined);
        }
    }

    public async removeFile(fileName: string): Promise<any> {
        try{
            await fs.remove(vscode.workspace.workspaceFolders[0].uri.fsPath + path.sep + fileName);
            return Promise.resolve(undefined);
        } catch(e) {
            return Promise.reject(undefined);
        }
    }

    /*
    *   This does all the work. It will run a cli command through the built in dx.
    *   Takes a command as an argument and a string for the command's arguments.
    */
    public async runCommand(cmdString: string, arg: string): Promise<any> {
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
        if(cliContext.flags['targetusername'] === undefined && vscode.window.forceCode.config.username !== undefined && cmd.flags.find(fl => { return fl.name === 'targetusername' }) !== undefined) {
            cliContext.flags['targetusername'] = vscode.window.forceCode.config.username;
        } 
        var objresult = await cmd.run(cliContext);
        
        if(!this.isEmptyUndOrNull(objresult)) {
            return Promise.resolve(objresult);
        }
        return Promise.reject('Failed to execute command: ' + cmdString + this.outputToString(theArgsArray));
    }

    public execAnon(file: string): Promise<ExecuteAnonymousResult> {
        return Promise.resolve(this.runCommand('apex:execute', '--apexcodefile ' + file));
    }

    public toqlQuery(query: string): Promise<QueryResult> {
        return Promise.resolve(this.runCommand('data:soql:query', '-q ' + query + ' -t -r json'));
    }

    public login(): Promise<any> {
        if(!this.isLoggedIn) {
            return this.runCommand('auth:web:login', '--instanceurl ' + vscode.window.forceCode.config.url).then(() => {
                return this.getOrgInfo().then(res => {
                    return Promise.resolve(res);
                });
            });
        } else {
            return Promise.resolve();
        }
    }

    public logout(): Promise<any> {
        if(this.isLoggedIn) {
            this.isLoggedIn = false;
            this.orgInfo = undefined;
            clearInterval(vscode.window.forceCode.statusInterval);
            vscode.commands.executeCommand('setContext', 'ForceCodeActive', false);
            return Promise.resolve(this.runCommand('auth:logout', '--noprompt')).then(() => {
                vscode.window.forceCode.config = undefined;
                return Promise.resolve();  
            });
        } else {
            return Promise.resolve();
        }
    }

    public getOrgInfo(): Promise<SFDX> {
        return this.runCommand('org:display', '--json').then(res => {
            this.isLoggedIn = true;
            this.orgInfo = res;
            return this.toqlQuery("SELECT Id FROM User WHERE UserName='" + this.orgInfo.username + "'")
                .then(result => {
                    this.orgInfo.userId = result.records[0].Id;
                    return Promise.resolve(this.orgInfo);
                });
        }, () => {
            this.isLoggedIn = false;
            this.orgInfo = undefined;
            return vscode.window.showWarningMessage('ForceCode: You are not logged in. Login now?', 'Yes', 'No').then(s => {
                if (s === 'Yes') {
                    return commandService.runCommand('ForceCode.enterCredentials', undefined);
                } 
                return undefined;
            });
        });
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
        return Promise.resolve(this.runCommand('org:open', ''));
    }

    public openOrgPage(url: string): Promise<any> {
        return Promise.resolve(this.runCommand('org:open', '-p ' + url));
    }
}