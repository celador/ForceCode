import { EventEmitter } from 'events';

export interface FCCancellationToken {
  isCanceled: boolean;
  cancellationEmitter: EventEmitter;
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
    this.cancellationToken = { isCanceled: false, cancellationEmitter: new EventEmitter() };
  }

  public abstract command(context: any, selectedResource: any): any;

  public run(context: any, selectedResource: any): any {
    // reset the variables
    this.cancellationToken.cancellationEmitter.removeAllListeners();
    this.cancellationToken.isCanceled = false;
    try {
      return this.command(context, selectedResource);
    } catch (e) {
      if (this.cancellationToken.isCanceled) {
        console.warn(e);
        return;
      } else {
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
