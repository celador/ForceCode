var alm: any = require('salesforce-alm');

export interface Arg {
    name: string;
    optional: boolean;
    hidden: boolean;
    value: string;
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
    app?: string;                 // `json:"app"`
    org?: string;                 // `json:"org,omitempty"`
    args?: Arg[];            // `json:"args"`
    flags: {}; // `json:"flags"`
    cwd?: string;                 // `json:"cwd"`
    herokuDir?: string;                 // `json:"herokuDir"`
    debug?: boolean;                   // `json:"debug"`
    debugHeaders?: boolean;                   // `json:"debugHeaders"`
    dev?: boolean;                   // `json:"dev"`
    supportsColor?: boolean;                   // `json:"supportsColor"`
    version?: string;                 // `json:"version"`
    APIToken?: string;                 // `json:"apiToken"`
    APIURL?: string;                 // `json:"apiUrl"`
    gitHost?: string;                 // `json:"gitHost"`
    HTTPGitHost?: string;                 // `json:"httpGitHost"`
    auth?: {
        Password: string; // `json:"password"`
    };
}

export interface Flag {
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
    run: (ctx: any) => Promise<string[]>;
    supportsTargetDevHubUsername: boolean;
    supportsTargetUsername: boolean;
    topic: string;
    usage: string;
}

/*
*   This does all the work. It will run a cli command through the built in dx.
*   Takes a command as an argument and a string for the command's arguments.
*/
export async function runCommand(cmd: Command, arg: string): Promise<string[]> {
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