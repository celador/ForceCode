/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export class Command {
  public readonly description?: string;
  public readonly args: string[];

  public constructor(builder: CommandBuilder) {
    this.description = builder.description;
    this.args = builder.args;
  }

  public toString(): string {
    return this.description
      ? this.description
      : `${this.args.join(' ')}`;
  }

  public toCommand(): string {
    return `${this.args.join(' ')}`;
  }
}

export class CommandBuilder {
  public description?: string;
  public args: string[] = [];

  public withDescription(description: string): CommandBuilder {
    this.description = description;
    return this;
  }

  public withArg(arg: string): CommandBuilder {
    this.args.push(arg);
    return this;
  }

  public withFlag(name: string, value: string): CommandBuilder {
    this.args.push(name, value);
    return this;
  }

  public build(): Command {
    return new Command(this);
  }
}
