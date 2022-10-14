import * as vscode from 'vscode';
import { OUTPUT_CHANNEL_NAME } from '.';
import { outputToString } from '../parsers';

export class Notifications {
  private static instance: Notifications;
  private outputChannel: vscode.OutputChannel;
  private statusBarItem: vscode.StatusBarItem;
  private statusTimeout: any;
  private isLoading: Boolean = false;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 6);
  }

  public static getInstance() {
    if (!Notifications.instance) {
      Notifications.instance = new Notifications();
    }
    return Notifications.instance;
  }

  public setStatusText(message: string, loading?: boolean) {
    this.statusBarItem.show();
    if (loading === false) {
      this.isLoading = false;
    } else if (this.isLoading || loading) {
      this.isLoading = true;
      message += ` $(loading~spin)`;
    }
    this.statusBarItem.text = message;
  }

  public resetLoading() {
    // just in case we don't want to change the displayed message
    this.isLoading = false;
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
    this.outputChannel.show(true);
  }

  public showError(message: any, ...items: string[]) {
    message = outputToString(message);
    let mParts = message.split('$#FC_LOG_ONLY_#*');
    let logMess = message;
    let theMess = message;
    if (mParts.length === 2) {
      // omit the split string
      logMess = mParts.join('');
      theMess = mParts[0];
    }
    this.writeLog(logMess);
    return vscode.window.showErrorMessage(theMess, ...items);
  }

  public showWarning(message: string, ...items: string[]) {
    message = outputToString(message);
    this.writeLog(message);
    return vscode.window.showWarningMessage(message, ...items);
  }

  public showInfo(message: string, ...items: string[]) {
    message = outputToString(message);
    this.writeLog(message);
    return vscode.window.showInformationMessage(message, ...items);
  }

  private resetStatus(instance: Notifications) {
    // for status bar updates. resets after 5 seconds
    if (instance.statusTimeout) {
      clearTimeout(instance.statusTimeout);
    }
    instance.statusTimeout = setTimeout(() => {
      instance.setStatusText(`ForceCode Menu`);
    }, 5000);
  }
}
