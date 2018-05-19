/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';

import { Command } from './';

export interface CancellationToken {
  isCancellationRequested: boolean;
}

export class CliCommandExecutor {
  private readonly command: Command;

  public constructor(command: Command) {
    this.command = command;
  }

  // this should return something other than 'any'
  public async execute(): Promise<string[]> {
    var curCmd = this.command.args.shift().replace('force:', '');
    var theArgs = this.command.args.join(' ');
    vscode.window.forceCode.outputChannel.appendLine('Executing command: ' + curCmd + ' ' + theArgs);

    const retVal = await vscode.window.forceCode.dxCommands.runCommand(curCmd, theArgs);
    return Promise.resolve(retVal);
  }
}
