import * as vscode from 'vscode';
import { OUTPUT_CHANNEL_NAME } from '.';
import { outputToString } from '../parsers';

export class Notifications {
  private static instance: Notifications;
  private outputChannel: vscode.OutputChannel;
  private statusBarItem: vscode.StatusBarItem;
  private statusTimeout: NodeJS.Timeout | undefined;
  private isLoading: boolean = false;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 6);
  }

  public static getInstance(): Notifications {
    if (!Notifications.instance) {
      Notifications.instance = new Notifications();
    }
    return Notifications.instance;
  }

  public setStatusText(message: string, loading?: boolean): void {
    this.statusBarItem.show();
    if (loading === false) {
      this.isLoading = false;
      if (message.includes(` $(loading~spin)`)) {
        message = message.replace(` $(loading~spin)`, '');
      }
    } else if (this.isLoading || loading) {
      this.isLoading = true;
      if (!message.includes(` $(loading~spin)`)) {
        message += ` $(loading~spin)`;
      }
    }
    this.statusBarItem.text = message;
  }

  public showLoading(): void {
    this.setStatusText(this.statusBarItem.text, true);
  }

  public resetLoading(): void {
    this.setStatusText(this.statusBarItem.text, false);
  }

  public showStatus(message: string): void {
    this.writeLog(message);
    this.setStatusText(message);
    this.resetStatus();
  }

  public hideStatus(): void {
    this.statusBarItem.hide();
  }

  public setStatusCommand(command: string): void {
    this.statusBarItem.command = command;
  }

  public setStatusTooltip(tooltip: string): void {
    this.statusBarItem.tooltip = tooltip;
  }

  public clearLog(): void {
    this.outputChannel.clear();
  }

  public writeLog(data: any): void {
    console.log('raw log: ', data);
    const stringData = outputToString(data);
    this.outputChannel.appendLine(stringData);
  }

  public showLog(): void {
    this.outputChannel.show(true);
  }

  public showError(message: any, ...items: string[]): Thenable<string | undefined> {
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

  public showWarning(message: string, ...items: string[]): Thenable<string | undefined> {
    message = outputToString(message);
    this.writeLog(message);
    return vscode.window.showWarningMessage(message, ...items);
  }

  public showInfo(message: string, ...items: string[]): Thenable<string | undefined> {
    message = outputToString(message);
    this.writeLog(message);
    return vscode.window.showInformationMessage(message, ...items);
  }

  private resetStatus(): void {
    // for status bar updates. resets after 5 seconds
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
    }
    this.statusTimeout = setTimeout(() => {
      this.setStatusText('ForceCode Menu');
    }, 5000);
  }
}
