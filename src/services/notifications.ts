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
    this.outputChannel.show(true);
  }

  public showError(message: any, ...items: string[]) {
    message = outputToString(message);
    var mParts = message.split('$#FC_LOG_ONLY_#*');
    var logMess = message;
    var theMess = message;
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
    instance.statusTimeout = setTimeout(function() {
      instance.statusBarItem.text = `ForceCode Menu`;
    }, 5000);
  }
}
