import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
var alm: any = require('salesforce-alm');

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

export function getCommand(cmd: string): Command {
    return alm.commands.filter(c => {
        return (c.topic + ':' + c.command) === cmd;
    })[0];
}

export function outputToString(toConvert: any, depth?: number): string {
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
        retval = brTabs + '{\n';
        level++;
        Object.keys(toConvert).forEach(key => {
            retval += tabs + key + ': ' + outputToString(toConvert[key], level) + ',\n';
        });
        level--;
        retval += brTabs + '}';
    } else {
        retval = toConvert;
    }
    return retval;
}

/*
*   This does all the work. It will run a cli command through the built in dx.
*   Takes a command as an argument and a string for the command's arguments.
*/
export async function runCommand(cmdString: string, arg: string): Promise<any> {
    var cmd: Command = getCommand(cmdString);
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
                var commandName = curCmd[0];
                if(curCmd[0].length === 1) {
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
                if(curCmd.length === 2)
                    cliContext.flags[commandName] = curCmd[1];
                else
                    cliContext.flags[commandName] = true;
            }
        });
    }
    // add in targetusername so we can stay logged in
    if(cliContext.flags['targetusername'] === undefined && vscode.window.forceCode.config.username !== undefined 
        && cmd.flags['targetusername'] !== undefined) {
        cliContext.flags['targetusername'] = vscode.window.forceCode.config.username;
    } 
    var objresult = await cmd.run(cliContext);
    // log command output
    if(objresult !== undefined && objresult !== [''] && objresult !== '') {
        fs.outputFile(vscode.workspace.rootPath + path.sep + 'dx.log', outputToString(objresult));
    }
    return Promise.resolve(objresult);
}