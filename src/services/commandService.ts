import * as vscode from 'vscode';
import * as commands from './../models/commands';
import * as path from 'path';
import { commandViewService } from './';

export class CommandService {
    private static instance: CommandService;

    public static getInstance() {
        if (!CommandService.instance) {
          CommandService.instance = new CommandService();
        }
        return CommandService.instance;
      }

    public runCommand(command: string, context: any, selectedResource?: any) {
        // add something to keep track of the running command in here
        var theCommand = commands.default.find(cur => { return cur.commandName === command; });
        
        if(theCommand.commandName === 'ForceCode.compile' || theCommand.commandName === 'ForceCode.diff') {
            var fileName;
            var splitPath;
            if(selectedResource && selectedResource.path) {
                splitPath = selectedResource.fsPath.split(path.sep); 
            } else {
                splitPath = vscode.window.activeTextEditor.document.fileName.split(path.sep);
            }
            if(theCommand.commandName === 'ForceCode.compile') {
                theCommand.name = 'Saving ';
            } else {
                theCommand.name = 'Diffing ';
            }

            theCommand.name += splitPath[splitPath.length - 1].split('.')[0];
        }
        
        return commandViewService.addCommandExecution(theCommand, context, selectedResource);
    }
}