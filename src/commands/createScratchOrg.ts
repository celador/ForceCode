import * as vscode from 'vscode';
import { dxService, fcConnection } from '../services';
import { Config } from '../forceCode';
import { defaultOptions, saveConfigFile } from '../services/configuration';
import { ForcecodeCommand } from './forcecodeCommand';

export class CreateScratchOrg extends ForcecodeCommand {
  constructor() {
    super();
    this.cancelable = true;
    this.commandName = 'ForceCode.createScratchOrg';
    this.name = 'Creating scratch org';
    this.description = 'Create a scratch org associated with the current DevHub org';
    this.detail =
      'A scratch org will be created and added to the list of current usernames in the Forcecode view';
    this.icon = 'beaker';
    this.label = 'Create a scratch org';
    this.hidden = false;
  }

  public command(context: any, selectedResource: any): Promise<any> {
    // add option to select org def file or just create an org
    // ...
    // ...
    // skip the rest if a file is selected...

    // ask the user for the edition
    let options: vscode.QuickPickItem[] = [
      {
        label: 'Developer',
      },
      {
        label: 'Enterprise',
      },
      {
        label: 'Group',
      },
      {
        label: 'Professional',
      },
    ];
    let config: vscode.QuickPickOptions = {
      placeHolder: 'Choose an org edition to create...',
    };
    return new Promise((resolve, reject) => {
      vscode.window
        .showQuickPick(options, config)
        .then((edition: vscode.QuickPickItem | undefined) => {
          if (!edition) {
            return reject(this.cancellationToken.cancel());
          }

          let durOpts: vscode.QuickPickItem[] = [];
          for (var i = 1; i < 31; i++) {
            durOpts.push({ label: String(i) });
          }

          config.placeHolder = 'Days until org expires...';
          vscode.window
            .showQuickPick(durOpts, config)
            .then((duration: vscode.QuickPickItem | undefined) => {
              if (!duration) {
                return reject(this.cancellationToken.cancel());
              }

              let sDataOptions: vscode.QuickPickItem[] = [
                {
                  label: 'Yes',
                },
                {
                  label: 'No',
                },
              ];

              config['placeHolder'] = 'Create org with sample data?';
              vscode.window
                .showQuickPick(sDataOptions, config)
                .then((sampleData: vscode.QuickPickItem | undefined) => {
                  if (!sampleData) {
                    return reject(this.cancellationToken.cancel());
                  }

                  const sData: boolean = sampleData.label === 'Yes';

                  const theOptions: string =
                    '--durationdays ' +
                    duration.label +
                    ` edition=${edition.label} hasSampleData=${sData}`;
                  return dxService
                    .createScratchOrg(theOptions, this.cancellationToken)
                    .then(res => {
                      var scratchConfig: Config = defaultOptions;
                      scratchConfig.username = res.username;
                      saveConfigFile(res.username, scratchConfig);
                      fcConnection.refreshConnections().then(() => {
                        resolve(res);
                      });
                    })
                    .catch(reject);
                });
            });
        });
    });
  }
}
