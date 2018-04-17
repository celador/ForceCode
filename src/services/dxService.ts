import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
var alm: any = require('salesforce-alm');

export interface SFDX {
    username: string,
    id: string,
    connectedStatus: string,
    accessToken: string,
    instanceUrl: string,
    clientId: string
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
    getCommand(cmd: string): Command;
    outputToString(toConvert: any, depth?: number): string;
    runCommand(cmdString: string, arg: string): Promise<any>;
    toqlQuery(query: string): Promise<QueryResult>;
    soqlQuery(query: string): Promise<QueryResult>;
    login(): Promise<any>;
    logout(): Promise<any>;
    getOrgInfo(): Promise<SFDX>;
    isEmptyUndOrNull(param: any): boolean;
    getDebugLog(logid?: string): Promise<string>;
    saveToFile(data: any, fileName: string): Promise<string>;
    filterLog(body: string): string;
    getAndShowLog(id?: string): Promise<any>;
}

export default class DXService implements DXCommands {

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
            await fs.outputFile(vscode.workspace.rootPath + path.sep + fileName, this.outputToString(data));
            return Promise.resolve(vscode.workspace.rootPath + path.sep + fileName);
        } catch(e) {
            return Promise.reject(undefined);
        }
    }

    public filterLog(body: string): string {
        if (vscode.window.forceCode.config.debugOnly) {
            var theLog = '';
            var showOutput = true;
            var debugLevel = ['USER_DEBUG'];
            if(vscode.window.forceCode.config.debugFilter)
            {
                debugLevel = vscode.window.forceCode.config.debugFilter.split('|');
            }
            body.split('\n').forEach(function(l) {
                var includeIt = false;
                debugLevel.forEach(function(i) {
                    if(l.includes(i))
                    {
                        includeIt = true;
                    }
                });
                if(l.includes('CUMULATIVE_LIMIT_USAGE_END'))
                {
                    showOutput = true;
                }
                else if(l.includes('CUMULATIVE_LIMIT_USAGE')) 
                {
                    showOutput = false;
                }            
                if(((l.indexOf(':') !== 2 && l.indexOf(':', 5) !== 5 && theLog !== '') || includeIt) && showOutput) {
                    // if it doesn't start with the time then we have a newline from debug logs or limit output
                    theLog += l + '\n';
                }
            });
            return theLog;
        } else {
            return body;
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
        var flags: {} = {};

        var cliContext: Context = {
            command: cmd,
            topic: topic,
            flags: {}
        };

        if(arg !== undefined && arg !== '') {
            var theArgsArray = arg.trim().split('-'); 
            theArgsArray.forEach(function(i) {
                if(i.length > 0) {
                    var curCmd = new Array();
                    //console.log(i);
                    curCmd = i.trim().split(' ');
                    var commandName = curCmd.shift();
                    if(commandName.length === 1) {
                        // this means we need to search for the argument name
                        cmd.flags.some(fl => {
                            if(fl.char === commandName)
                            {
                                commandName = fl.name;
                                return true;
                            }
                        });
                    }
                    //console.log(curCmd);
                    if(curCmd.length > 0)
                        cliContext.flags[commandName] = curCmd.join(' ').trim();
                    else
                        cliContext.flags[commandName] = true;
                }
            });
        }
        // add in targetusername so we can stay logged in
        if(cliContext.flags['targetusername'] === undefined && vscode.window.forceCode.config.username !== undefined) {
            cmd.flags.some(fl => {
                if(fl.name === 'targetusername')
                {
                    cliContext.flags['targetusername'] = vscode.window.forceCode.config.username;
                    return true;
                }
            });
        } 
        var objresult = await cmd.run(cliContext);
        // log command output
        if(!this.isEmptyUndOrNull(objresult)) {
            fs.outputFile(vscode.workspace.rootPath + path.sep + 'dx.log', this.outputToString(objresult));
            return Promise.resolve(objresult);
        }
        return Promise.reject('Failed to execute command: ' + cmdString + ' ' + arg);
    }

    public toqlQuery(query: string): Promise<QueryResult> {
        return Promise.resolve(this.soqlQuery(query + ' -t'));
    }

    public soqlQuery(query: string): Promise<QueryResult> {
        return Promise.resolve(this.runCommand('data:soql:query', '-q ' + query + ' -r json'));
    }

    public login(): Promise<any> {
        vscode.window.forceCode.isLoggedIn = false;
        return this.runCommand('auth:web:login', '--instanceurl ' + vscode.window.forceCode.config.url).then(res => {
                vscode.window.forceCode.isLoggedIn = true;
            return Promise.resolve(res);
        });
    }

    public logout(): Promise<any> {
        vscode.window.forceCode.isLoggedIn = false;
        vscode.commands.executeCommand('setContext', 'ForceCodeActive', false);
        return Promise.resolve(this.runCommand('auth:logout', '--noprompt'));
    }

    public getOrgInfo(): Promise<SFDX> {
        return this.runCommand('org:display', '--json').then(res => {
            vscode.window.forceCode.isLoggedIn = true;
            return Promise.resolve(res);
        }, reason => {
            vscode.window.forceCode.isLoggedIn = false;
            return Promise.reject('No info recieved from org. Are you logged in?');
        });
    }

    public getDebugLog(logid?: string): Promise<string> {
        var theLogId: string = '';
        if(logid) {
            console.log(logid)
            theLogId += '--logid ' + logid;
        }
        return this.runCommand('apex:log:get', theLogId).then(log => {
            return Promise.resolve(this.filterLog(this.outputToString(log.log)));
        });
    }

    public getAndShowLog(id?: string): Promise<any> {
        return this.getDebugLog(id ? id : undefined).then(log => {
            return this.saveToFile(log, (id ? id : 'debugLog') + '.log').then(path => {
                if(path) {
                    return vscode.workspace.openTextDocument(vscode.Uri.file(path)).then(function (_document: vscode.TextDocument) {
                        return vscode.window.showTextDocument(_document, 3, true);
                    });
                }
            })
        });
    }
}