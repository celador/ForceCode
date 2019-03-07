import * as vscode from 'vscode';
import * as commands from './../models/commands';
import * as path from 'path';
import { commandViewService } from './';
import { FCCommand } from './commandView';

export class CommandService {
  private static instance: CommandService;

  public static getInstance() {
    if (!CommandService.instance) {
      CommandService.instance = new CommandService();
    }
    return CommandService.instance;
  }

  public runCommand(command: string, context: any, selectedResource?: any): Promise<any> {
    // add something to keep track of the running command in here
    var theCommand: FCCommand = commands.fcCommands.find(cur => {
      return cur.commandName === command;
    });

    if (!theCommand) {
      return Promise.reject('Invalid command');
    }
    if (
      ['ForceCode.compileMenu', 'ForceCode.refreshContext'].find(c => {
        return c === theCommand.commandName;
      })
    ) {
      var splitPath;
      if (context && context.fsPath) {
        splitPath = context.fsPath.split(path.sep);
      } else if (context) {
        splitPath = context.fileName.split(path.sep);
      } else if (vscode.window.activeTextEditor) {
        splitPath = vscode.window.activeTextEditor.document.fileName.split(path.sep);
      } else {
        return Promise.reject({
          message: 'Please open a file before trying to save through the ForceCode menu!',
        });
      }
      if (theCommand.commandName === 'ForceCode.compileMenu') {
        theCommand.name = 'Saving ';
      } else {
        theCommand.name = 'Refreshing ';
      }

      theCommand.name += splitPath[splitPath.length - 1].split('.')[0];
    }

    return commandViewService.addCommandExecution(theCommand, context, selectedResource);
  }
}
