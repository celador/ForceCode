import * as vscode from 'vscode';
import * as error from './../util/error';
var alm: any = require('salesforce-alm');

interface Arg {
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
    run: (ctx: any) => Promise<string[]>;
    supportsTargetDevHubUsername: boolean;
    supportsTargetUsername: boolean;
    topic: string;
    usage: string;
}

export default function open(context: vscode.ExtensionContext) {
    var theCmd: any = undefined;
    vscode.window.forceCode.statusBarItem.text = 'DX Menu';
    vscode.window.forceCode.resetMenu();

    return vscode.window.forceCode.connect(context)
        .then(svc => showFileOptions())
        .then(getArgsAndRun)
        .then(out => vscode.window.forceCode.outputChannel.appendLine(out.toString()))
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));
    // =======================================================================================================================================
    function showFileOptions(): Thenable<vscode.QuickPickItem> {
        let options: vscode.QuickPickItem[] = alm.commands.filter(c => {
            return !c.hidden;
        }).map(c => {
            return {
                label: c.topic + ':' + c.command,
                description: c.longDescription,
                detail: c.usage
            };
        });
        let config: {} = {
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: 'DX Commands',
        };
        return vscode.window.showQuickPick(options, config);
    }

    function getArgsAndRun(opt: vscode.QuickPickItem): Thenable<string[]> {
        theCmd = alm.commands.filter(c => {
            return (c.topic + ':' + c.command) === opt.label;
        })[0];
        
        let options: vscode.InputBoxOptions = {
            ignoreFocusOut: true,
            value: '',
            placeHolder: 'enter the arguements for this dx function',
            prompt: theCmd.usage,
        };
        // this needs to wait for this input to get done somehow!!!
        return vscode.window.showInputBox(options).then(function (result: string) {
            if(result != undefined && result != '')
                return runCommand(theCmd, result);
        });
    }

    // =======================================================================================================================================
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