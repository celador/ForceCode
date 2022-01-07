import { EventEmitter } from 'events';
import { notifications, Task } from '../services';

export class FCCancellationToken {
  private isItCanceled: boolean;
  public readonly cancellationEmitter: EventEmitter;
  constructor() {
    this.isItCanceled = false;
    this.cancellationEmitter = new EventEmitter();
  }

  public isCanceled() {
    return this.isItCanceled;
  }

  public cancel() {
    this.isItCanceled = true;
    this.cancellationEmitter.emit('cancelled');
  }
}

export abstract class ForcecodeCommand {
  public cancelable?: boolean;
  public commandName!: string;
  public name?: string;
  public hidden?: boolean;
  public description?: string;
  public detail?: string;
  public icon?: string;
  public label?: string;
  public cancellationToken!: FCCancellationToken;

  public abstract command(context: any, selectedResource: any): any;

  public run(context: any, selectedResource: any): any {
    notifications.writeLog('about to run ' + this.commandName);
    // reset the variables
    this.cancellationToken = new FCCancellationToken();
    try {
      return this.command(context, selectedResource);
    } catch (e) {
      if (this.cancellationToken.isCanceled()) {
        return;
      } else {
        notifications.writeLog(e);
        throw e;
      }
    }
  }

  public cancel() {
    if (this.cancelable) {
      this.cancellationToken.cancel();
    }
  }
}

export class CancelCommand extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.cancelCommand';
    this.hidden = true;
  }

  public command(context: Task) {
    // TODO possible fix for `Cannot read property 'execution' of undefined`??
    return context?.execution.cancel();
  }
}
