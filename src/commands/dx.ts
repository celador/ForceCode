import * as vscode from 'vscode';
import * as error from './../util/error';

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
}

interface Command {
    command: string;
    description: string;
    flags: Flag[];
    help: string;
    longDescription: string;
    requiresWorkspace: boolean;
    run: (ctx: any) => any;
    supportsTargetDevHubUsername: boolean;
    supportsTargetUsername: boolean;
    topic: string;
    usage: string;
}

export default function open(context: vscode.ExtensionContext) {
    var alm: any = require('salesforce-alm');
    var theCmd: any = undefined;
    vscode.window.forceCode.statusBarItem.text = 'DX Menu';
    vscode.window.forceCode.resetMenu();

    return vscode.window.forceCode.connect(context)
        .then(svc => showFileOptions())
        .then(getArgsAndRun)
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));
    // =======================================================================================================================================
    function showFileOptions() {
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

    function getArgsAndRun(opt: vscode.QuickPickItem): any {
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
            var topic: Topic = alm.topics.filter(t => {
                return t.name === theCmd.topic;
            })[0];
            var flags: {} = {};
            theCmd.flags.forEach(f => {
                flags[f.name] = f.type === 'flag' ? true : f.default;
            });
        
            var cliContext: Context = {
                command: theCmd,
                topic: topic,
                flags: {}
            };

            if(result !== undefined) {
                var theArgsArray = result.split('-'); 
                theArgsArray.forEach(function(i) {
                    if(i.length > 0) {
                        var curCmd = new Array();
                        console.log(i);
                        curCmd = i.trim().split(' ');
                        console.log(curCmd);
                        if(curCmd.length >= 2)
                            cliContext.flags[curCmd[0]] = curCmd[1];
                        else
                            cliContext.flags[curCmd[0]] = true;
                    }
                });
            }

            console.log(cliContext);

            return theCmd.run(cliContext);
        });
    }

    // =======================================================================================================================================
}