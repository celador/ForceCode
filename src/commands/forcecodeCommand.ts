import { EventEmitter } from 'events';
import { notifications } from '../services';

export class FCCancellationToken {
  public isCanceled: boolean;
  public cancellationEmitter: EventEmitter;
  constructor() {
    this.isCanceled = false;
    this.cancellationEmitter = new EventEmitter();
  }
}

export abstract class ForcecodeCommand {
  public cancelable: boolean;
  public commandName: string;
  public name?: string;
  public hidden: boolean;
  public description?: string;
  public detail?: string;
  public icon?: string;
  public label?: string;
  public cancellationToken: FCCancellationToken;

  constructor() {
    this.cancellationToken = new FCCancellationToken();
  }

  public abstract command(context: any, selectedResource: any): any;

  public run(context: any, selectedResource: any): any {
    // reset the variables
    this.cancellationToken = new FCCancellationToken();
    try {
      return this.command(context, selectedResource);
    } catch (e) {
      if (this.cancellationToken.isCanceled) {
        return;
      } else {
        notifications.writeLog(e);
        throw e;
      }
    }
  }

  public cancel() {
    if (this.cancelable) {
      this.cancellationToken.isCanceled = true;
      this.cancellationToken.cancellationEmitter.emit('cancelled');
    }
  }
}

export class CancelCommand extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.cancelCommand';
    this.hidden = true;
  }

  public command(context, selectedResource?) {
    return context.execution.cancel();
  }
}
