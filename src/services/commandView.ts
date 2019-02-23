/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { fcConnection } from '.';
import { EventEmitter } from 'events';
import { trackEvent } from './fcAnalytics';

export interface FCCommand {
  commandName: string;
  name?: string;
  hidden: boolean;
  description?: string;
  detail?: string;
  icon?: string;
  label?: string;
  command: (context: any, selectedResource: any) => any;
}

const FIRST_TRY = 1;
const SECOND_TRY = 2;

export class CommandViewService implements vscode.TreeDataProvider<Task> {
  private runningTasksStatus: vscode.StatusBarItem;
  private static instance: CommandViewService;
  private readonly tasks: Task[];
  private fileModCommands: number = 0;
  private _onDidChangeTreeData: vscode.EventEmitter<Task | undefined> = new vscode.EventEmitter<
    Task | undefined
  >();

  public readonly onDidChangeTreeData: vscode.Event<Task | undefined> = this._onDidChangeTreeData
    .event;
  public removeEmitter = new EventEmitter();

  public constructor() {
    this.tasks = [];
    this.runningTasksStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 5);
    this.removeEmitter.on('removeTask', theTask => this.removeTask(theTask));
  }

  public static getInstance() {
    if (!CommandViewService.instance) {
      CommandViewService.instance = new CommandViewService();
    }
    return CommandViewService.instance;
  }

  public addCommandExecution(execution: FCCommand, context: any, selectedResource?: any) {
    if (execution.commandName === 'ForceCode.fileModified') {
      this.fileModCommands++;
      if (
        this.fileModCommands >
        vscode.workspace.getConfiguration('force')['maxFileChangeNotifications']
      ) {
        return Promise.resolve();
      }
    }

    var theTask: Task = new Task(this, execution, context, selectedResource);
    this.tasks.push(theTask);
    this.runningTasksStatus.text = 'ForceCode: Executing ' + this.getChildren().length + ' Task(s)';
    this.runningTasksStatus.show();
    this.runningTasksStatus.command = 'ForceCode.showTasks';

    this._onDidChangeTreeData.fire();
    return theTask.run(FIRST_TRY);
  }

  public removeTask(task: Task): boolean {
    const index = this.tasks.indexOf(task);
    if (index !== -1) {
      if (this.tasks[index].execution.commandName === 'ForceCode.fileModified') {
        this.fileModCommands--;
      }
      this.tasks.splice(index, 1);

      if (this.getChildren().length > 0) {
        this.runningTasksStatus.text =
          'ForceCode: Executing ' + this.getChildren().length + ' Tasks';
      } else {
        this.runningTasksStatus.hide();
      }

      this._onDidChangeTreeData.fire();
      fcConnection.refreshConnsStatus();
      return true;
    }
    return false;
  }

  public getTreeItem(element: Task): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: Task): Task[] {
    if (!element) {
      // This is the root node
      return this.tasks.filter(cur => {
        return cur.label !== '' && cur.label !== undefined;
      });
    }

    return [];
  }

  public getParent(element: Task): any {
    return null; // this is the parent
  }
}

export class Task extends vscode.TreeItem {
  public readonly collapsibleState: vscode.TreeItemCollapsibleState;
  public readonly execution: FCCommand;
  private readonly taskViewProvider: CommandViewService;
  private readonly context: any;
  private readonly selectedResource: any;

  constructor(
    taskViewProvider: CommandViewService,
    execution: FCCommand,
    context: any,
    selectedResource?: any
  ) {
    super(execution.name, vscode.TreeItemCollapsibleState.None);

    this.taskViewProvider = taskViewProvider;
    this.execution = execution;
    this.context = context;
    this.selectedResource = selectedResource;
  }

  public run(attempt: number) {
    return new Promise(resolve => {
      resolve(this.execution.command(this.context, this.selectedResource));
    })
      .catch(reason => {
        return fcConnection.checkLoginStatus(reason).then(loggedIn => {
          if (loggedIn || attempt === SECOND_TRY) {
            if (reason) {
              vscode.window.showErrorMessage(reason.message ? reason.message : reason, 'OK');
              return trackEvent('Error Thrown', reason.message ? reason.message : reason).then(
                () => {
                  return reason;
                }
              );
            }
          } else {
            return 'FC:AGAIN';
          }
        });
      })
      .then(finalRes => {
        if (finalRes === 'FC:AGAIN') {
          // try again, possibly had to refresh the access token
          return this.run(SECOND_TRY);
        } else {
          this.taskViewProvider.removeEmitter.emit('removeTask', this);
          return finalRes;
        }
      });
  }
}
