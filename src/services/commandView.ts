/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
import {
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState
} from 'vscode';

export class CommandViewService implements TreeDataProvider<Task> {
  private static instance: CommandViewService;
  private readonly tasks: Task[];
  private _onDidChangeTreeData: EventEmitter<
    Task | undefined
  > = new EventEmitter<Task | undefined>();

  public readonly onDidChangeTreeData: Event<Task | undefined> = this
    ._onDidChangeTreeData.event;

  public constructor() {
    this.tasks = [];
  }

  public static getInstance() {
    if (!CommandViewService.instance) {
      CommandViewService.instance = new CommandViewService();
    }
    return CommandViewService.instance;
  }

  public addCommandExecution(execution: CommandExecution): Task {
    const task = new Task(this, execution);
    task.monitor();
    this.tasks.push(task);

    this._onDidChangeTreeData.fire();
    return task;
  }

  public removeTask(task: Task): boolean {
    const index = this.tasks.indexOf(task);
    if (index !== -1) {
      this.tasks.splice(index, 1);

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
}

export class Task extends TreeItem {
  public readonly label: string;
  public readonly collapsibleState: TreeItemCollapsibleState;

  private readonly taskViewProvider: CommandViewService;
  private readonly execution: CommandExecution;

  constructor(taskViewProvider: CommandViewService, execution: CommandExecution) {
    super(
      nls.localize('task_view_running_message', execution.command),
      TreeItemCollapsibleState.None
    );

    this.taskViewProvider = taskViewProvider;
    this.execution = execution;
  }

  public monitor() {
    this.execution.processExitSubject.subscribe(data => {
      this.taskViewProvider.removeTask(this);
    });
    this.execution.processErrorSubject.subscribe(data => {
      this.taskViewProvider.removeTask(this);
    });
  }
}
*/