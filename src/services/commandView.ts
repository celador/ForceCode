/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  Event,
  EventEmitter,
  StatusBarItem,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  window
} from 'vscode';

import * as vscode from 'vscode';

export class CommandViewService implements TreeDataProvider<Task> {
  private runningTasksStatus: StatusBarItem;
  private static instance: CommandViewService;
  private readonly tasks: Task[];
  private _onDidChangeTreeData: EventEmitter<
    Task | undefined
  > = new EventEmitter<Task | undefined>();

  public readonly onDidChangeTreeData: Event<Task | undefined> = this
    ._onDidChangeTreeData.event;

  public constructor() {
    this.tasks = [];
    this.runningTasksStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 5);
  }

  public static getInstance() {
    if (!CommandViewService.instance) {
      CommandViewService.instance = new CommandViewService();
    }
    return CommandViewService.instance;
  }

  public addCommandExecution(execution: any, context: any, selectedResource?: any) {
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

  public getTreeItem(element: Task): TreeItem {
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

export class Task extends TreeItem {
  public readonly collapsibleState: TreeItemCollapsibleState;

  private readonly taskViewProvider: CommandViewService;
  private readonly execution: any;
  private readonly context: any;
  private readonly selectedResource: any;

  constructor(taskViewProvider: CommandViewService, execution: any, context: any, selectedResource?: any) {
    super(
      execution.name,
      TreeItemCollapsibleState.None
    );

    this.taskViewProvider = taskViewProvider;
    this.execution = execution;
    this.context = context;
    this.selectedResource = selectedResource;
  }

  public run() {
    return Promise.resolve(this.execution.command(this.context, this.selectedResource))
      .then(res => Promise.resolve(res), 
      reason => {
        window.showErrorMessage(reason.message ? reason.message : reason);
        Promise.resolve(reason);
      })
      .then(done => {
          this.taskViewProvider.removeTask(this);
          return done;
      });
  }
}