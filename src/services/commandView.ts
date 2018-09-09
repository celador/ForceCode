/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { switchUserViewService } from '.';
import { EventEmitter } from 'events';

export interface FCCommand {
  commandName: string,
  name?: string,
  hidden: boolean,
  description?: string,
  detail?: string,
  icon?: string,
  label?: string,
  command: (context: any, selectedResource: any) => any;
}

export class CommandViewService implements vscode.TreeDataProvider<Task> {
  private runningTasksStatus: vscode.StatusBarItem;
  private static instance: CommandViewService;
  private readonly tasks: Task[];
  private _onDidChangeTreeData: vscode.EventEmitter<
    Task | undefined
  > = new vscode.EventEmitter<Task | undefined>();

  public readonly onDidChangeTreeData: vscode.Event<Task | undefined> = this
    ._onDidChangeTreeData.event;
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

  public addCommandExecution(execution: FCCommand, context: any, selectedResource?: any) {
    var theTask: Task = new Task(this, execution, context, selectedResource);
    this.tasks.push(theTask);
    this.runningTasksStatus.text = 'ForceCode: Executing ' + this.tasks.length + ' Task(s)';
    this.runningTasksStatus.show();
    this.runningTasksStatus.command = 'ForceCode.showTasks';

    this._onDidChangeTreeData.fire();
    return theTask.run();
  }

  public removeTask(task: Task): boolean {
    const index = this.tasks.indexOf(task);
    if (index !== -1) {
      this.tasks.splice(index, 1);

      if(this.tasks.length > 0) {
        this.runningTasksStatus.text = 'ForceCode: Executing ' + this.tasks.length + ' Tasks';
      } else {
        this.runningTasksStatus.hide();
      }

      this._onDidChangeTreeData.fire();
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
      return this.tasks;
    }

    return [];
  }

  public getParent(element: Task): any {
    return null;    // this is the parent
  }
}

export class Task extends vscode.TreeItem {
  public readonly collapsibleState: vscode.TreeItemCollapsibleState;

  private readonly taskViewProvider: CommandViewService;
  private readonly execution: any;
  private readonly context: any;
  private readonly selectedResource: any;

  constructor(taskViewProvider: CommandViewService, execution: FCCommand, context: any, selectedResource?: any) {
    super(
      execution.name,
      vscode.TreeItemCollapsibleState.None
    );

    this.taskViewProvider = taskViewProvider;
    this.execution = execution;
    this.context = context;
    this.selectedResource = selectedResource;
  }

  public run() {
    return new Promise((resolve) => { resolve(this.execution.command(this.context, this.selectedResource)); })
      .catch(reason => {
        switchUserViewService.checkLoginStatus().then(loggedIn => {
          if(loggedIn) {
            vscode.window.showErrorMessage(reason.message ? reason.message : reason);
          }
          return reason;
        });
      })
      .then(finalRes => {
        this.taskViewProvider.removeEmitter.emit('removeTask', this);
        return finalRes;
      });
  }
}