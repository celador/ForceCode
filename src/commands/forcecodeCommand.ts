import { EventEmitter } from 'events';

export abstract class ForcecodeCommand {
  public cancelable: boolean;
  public isCanceled: boolean;
  public commandName: string;
  public name?: string;
  public hidden: boolean;
  public description?: string;
  public detail?: string;
  public icon?: string;
  public label?: string;
  public cancellationToken: EventEmitter;

  constructor() {
    this.cancellationToken = new EventEmitter();
  }

  public abstract command(context: any, selectedResource: any): any;

  public run(context: any, selectedResource: any): any {
    // reset the variables
    this.isCanceled = false;
    this.cancellationToken.removeAllListeners();
    try {
      return this.command(context, selectedResource);
    } catch (e) {
      if (this.isCanceled) {
        return;
      } else {
        throw e;
      }
    }
  }

  public cancel() {
    if (this.cancelable) {
      this.isCanceled = true;
      this.cancellationToken.emit('cancelled');
    }
  }
}
