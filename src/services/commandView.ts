/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { fcConnection, notifications, trackEvent, FCTimer, getVSCodeSetting } from '.';
import { EventEmitter } from 'events';
import { ForcecodeCommand } from '../commands';
import * as path from 'path';

const FIRST_TRY = 1;
const SECOND_TRY = 2;

export enum CoverageRetrieveType {
  StartUp,
  OpenFile,
  RunTest,
}

export class CommandViewService implements vscode.TreeDataProvider<Task> {
  private runningTasksStatus: vscode.StatusBarItem;
  private static instance: CommandViewService;
  private readonly tasks: Task[];
  private fileModCommands: number = 0;
  private getCodeCoverage: boolean = false;
  private _onDidChangeTreeData: vscode.EventEmitter<Task | undefined> = new vscode.EventEmitter<
    Task | undefined
  >();

  public readonly onDidChangeTreeData: vscode.Event<Task | undefined> = this._onDidChangeTreeData
    .event;
  public removeEmitter = new EventEmitter();

  public constructor() {
    this.tasks = [];
    this.runningTasksStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 5);
    this.removeEmitter.on('removeTask', (theTask) => this.removeTask(theTask));
  }

  public static getInstance() {
    if (!CommandViewService.instance) {
      CommandViewService.instance = new CommandViewService();
    }
    return CommandViewService.instance;
  }

  public enqueueCodeCoverage(type: CoverageRetrieveType) {
    // mandatory since it only makes sense
    if (type === CoverageRetrieveType.RunTest) {
      this.getCodeCoverage = true;
    } else if (
      type === CoverageRetrieveType.OpenFile &&
      getVSCodeSetting('retrieveCoverageOnFileRetrieval')
    ) {
      this.getCodeCoverage = true;
    } else if (
      type === CoverageRetrieveType.StartUp &&
      getVSCodeSetting('retrieveCodeCoverageOnStart')
    ) {
      this.getCodeCoverage = true;
    }
    return Promise.resolve(false);
  }

  public addCommandExecution(execution: ForcecodeCommand, context: any, selectedResource?: any) {
    if (
      ['ForceCode.compile', 'ForceCode.refresh'].find((c) => {
        return c === execution?.commandName;
      })
    ) {
      var splitPath;
      if (context?.fsPath) {
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
      if (execution.commandName === 'ForceCode.compile') {
        execution.name = 'Saving ';
      } else {
        execution.name = 'Refreshing ';
      }

      execution.name += splitPath[splitPath.length - 1].split('.')[0];
    }

    if (execution.commandName === 'ForceCode.fileModified') {
      if (this.fileModCommands >= getVSCodeSetting('maxFileChangeNotifications')) {
        return Promise.resolve();
      }
      this.fileModCommands++;
    }

    var theTask: Task = new Task(this, execution, context, selectedResource);
    this.tasks.push(theTask);
    const visibleTasks = this.getChildren().length;
    if (visibleTasks > 0) {
      this.runningTasksStatus.text =
        '$(loading~spin) ForceCode: Executing ' + visibleTasks + ' Task(s)';
      this.runningTasksStatus.show();
      this.runningTasksStatus.command = 'ForceCode.showTasks';
    }

    this._onDidChangeTreeData.fire(undefined);
    return theTask.run(FIRST_TRY);
  }

  public removeTask(task: Task): boolean {
    const index = this.tasks.indexOf(task);
    if (index !== -1) {
      if (task.execution.commandName === 'ForceCode.fileModified') {
        this.fileModCommands--;
      }
      this.tasks.splice(index, 1);

      if (this.getChildren().length > 0) {
        this.runningTasksStatus.text =
          '$(loading~spin) ForceCode: Executing ' + this.getChildren().length + ' Tasks';
      } else {
        this.runningTasksStatus.hide();
        // when code coverage is enqueued, it will only be retrieved when no other visible tasks are running
        if (this.getCodeCoverage) {
          this.getCodeCoverage = false;
          vscode.commands
            .executeCommand('ForceCode.getCodeCoverage', undefined, undefined)
            .then(() => {
              notifications.writeLog('Done retrieving code coverage');
            });
        }
      }

      this._onDidChangeTreeData.fire(undefined);
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
      return this.tasks.filter((cur) => {
        return cur.label !== '' && cur.label !== undefined;
      });
    }

    return [];
  }

  public getParent(_element: Task): any {
    return null; // this is the parent
  }
}

export class Task extends vscode.TreeItem {
  public readonly execution: ForcecodeCommand;
  private readonly taskViewProvider: CommandViewService;
  private readonly context: any;
  private readonly selectedResource: any;
  private readonly commandTimer: FCTimer;

  constructor(
    taskViewProvider: CommandViewService,
    execution: ForcecodeCommand,
    context: any,
    selectedResource?: any
  ) {
    super(execution.name || '', vscode.TreeItemCollapsibleState.None);

    this.commandTimer = new FCTimer(execution.commandName);
    this.taskViewProvider = taskViewProvider;
    this.execution = execution;
    this.context = context;
    this.selectedResource = selectedResource;
    if (this.execution.cancelable) {
      this.contextValue = 'forceCodeTask';
      this.command = {
        command: 'ForceCode.cancelCommand',
        title: '',
        arguments: [this],
      };
    }
  }

  public run(attempt: number): Promise<any> {
    return new Promise((resolve) => {
      resolve(this.execution.run(this.context, this.selectedResource));
    })
      .catch((reason) => {
        if (this.execution.cancellationToken.isCanceled()) {
          return Promise.resolve();
        }
        return fcConnection
          .checkLoginStatus(reason, this.execution.cancellationToken)
          .then((loggedIn) => {
            notifications.writeLog('Logged in: ' + loggedIn);
            notifications.writeLog('Error reason: ' + reason?.message || reason);
            if (loggedIn || attempt === SECOND_TRY) {
              if (reason) {
                notifications.showError(reason.message || reason, 'OK');
                return trackEvent('Error Thrown', reason.message || reason).then(() => {
                  return reason;
                });
              }
            } else {
              return 'FC:AGAIN';
            }
          });
      })
      .then((finalRes) => {
        if (finalRes === 'FC:AGAIN') {
          // try again, possibly had to refresh the access token
          return this.run(SECOND_TRY);
        } else {
          this.taskViewProvider.removeEmitter.emit('removeTask', this);
          this.commandTimer.stopTimer();
          return finalRes;
        }
      });
  }
}
