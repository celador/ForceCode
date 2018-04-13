import { underline } from "chalk";

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

export function outputToString(toConvert: any): string {
    if(toConvert === undefined || toConvert === null)
    {
        return 'No output from command.';
    }
    if(typeof toConvert === 'object') {
        var retval: string = '';
        Object.keys(toConvert).forEach(key => {
            retval += key + ': ' + outputToString(toConvert[key]);
        });
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
    var objresult = await cmd.run(cliContext);

    return Promise.resolve(objresult);
}