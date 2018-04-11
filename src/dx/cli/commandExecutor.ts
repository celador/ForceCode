/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

//import { ChildProcess, ExecOptions, spawn } from 'child_process';   // this will need to go away and be replaced with a 'connector' to salesforce-alm
import * as os from 'os';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/interval';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import * as dx from '../../commands/dx';

// tslint:disable-next-line:no-var-requires
const kill = require('tree-kill');

import { Command } from './';

export interface CancellationToken {
  isCancellationRequested: boolean;
}

export class CliCommandExecutor {
  private readonly command: Command;
  private readonly options: {};

  public constructor(command: Command, options: {}) {
    this.command = command;
    this.options = options;
  }

  // this should return something other than 'any'
  public async execute(): Promise<string> {
    var alm: any = require('salesforce-alm');
    var curCmd = this.command.args.shift().replace('force:', '');
    var theCmd = alm.commands.filter(c => {
      //console.log('topic:' + c.topic);
      //console.log('command:' + c.command);
      return (c.topic + ':' + c.command) === curCmd;
    })[0];
    console.log('curCmd:' + curCmd);
    console.log('theCmd:' + theCmd.command);
    console.log('command: ' + this.command);
    // This will be all we need
    // need to find the command based this.command.args[0]
    // the 'flags' will be in the rest of the array
    //console.log('command after shift: ' + this.command);
    return Promise.resolve(dx.runCommand(theCmd, this.command.args.join(' ')));
  }
}
