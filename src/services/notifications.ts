import * as vscode from 'vscode';
import constants from '../models/constants';
import { outputToString } from '../parsers/output';

export class Notifications {
  private static instance: Notifications;
  private outputChannel: vscode.OutputChannel;
  private statusBarItem: vscode.StatusBarItem;
  private statusTimeout: any;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel(constants.OUTPUT_CHANNEL_NAME);
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 6);
  }

  public static getInstance() {
    if (!Notifications.instance) {
      Notifications.instance = new Notifications();
    }
    return Notifications.instance;
  }

  public setStatusText(message: string) {
    this.statusBarItem.show();
    this.statusBarItem.text = message;
  }

  public showStatus(message: string) {
    this.writeLog(message);
    this.setStatusText(message);
    this.resetStatus(this);
  }

  public hideStatus() {
    this.statusBarItem.hide();
  }

  public setStatusCommand(command: string) {
    this.statusBarItem.command = command;
  }

  public setStatusTooltip(tooltip: string) {
    this.statusBarItem.tooltip = tooltip;
  }

  public clearLog() {
    this.outputChannel.clear();
  }

  public writeLog(data: any) {
    const stringData = outputToString(data);
    this.outputChannel.appendLine(stringData);
  }

  public showLog() {
    this.outputChannel.show();
  }

  public showError(message: string, ...items: string[]) {
    this.writeLog(message);
    return vscode.window.showErrorMessage(message, ...items);
  }

  public showInfo(message: string, ...items: string[]) {
    this.writeLog(message);
    return vscode.window.showInformationMessage(message, ...items);
  }

  private resetStatus(instance: Notifications) {
    // for status bar updates. resets after 5 seconds
    if (instance.statusTimeout) {
      clearTimeout(instance.statusTimeout);
    }
    instance.statusTimeout = setTimeout(function() {
      instance.statusBarItem.text = `ForceCode Menu`;
    }, 5000);
  }
}
