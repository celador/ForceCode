import * as vscode from 'vscode';
import { dxService, fcConnection } from '../services';
import { Config } from '../forceCode';
import { defaultOptions, saveConfigFile } from '../services/configuration';

export class CreateScratchOrg {
  private static instance: CreateScratchOrg;
  public command(): Promise<any> {
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
    let config: {} = {
      placeHolder: 'Choose an org edition to create...',
    };
    return new Promise((resolve, reject) => {
      vscode.window.showQuickPick(options, config).then((edition: vscode.QuickPickItem) => {
        if (!edition) {
          return Promise.resolve();
        }

        let durOpts: vscode.QuickPickItem[] = [];
        for (var i = 1; i < 31; i++) {
          durOpts.push({ label: String(i) });
        }

        config['placeHolder'] = 'Days until org expires...';
        vscode.window.showQuickPick(durOpts, config).then((duration: vscode.QuickPickItem) => {
          if (!duration) {
            return Promise.resolve();
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
            .then((sampleData: vscode.QuickPickItem) => {
              if (!sampleData) {
                return Promise.resolve();
              }

              const sData: boolean = sampleData.label === 'Yes';

              const optsObj = {
                edition: edition.label,
                hasSampleData: sData,
              };
              const theOptions: string =
                '--durationdays ' + duration.label + ' --definitionjson ' + JSON.stringify(optsObj);
              return dxService
                .createScratchOrg(theOptions)
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

  public static getInstance() {
    if (!CreateScratchOrg.instance) {
      CreateScratchOrg.instance = new CreateScratchOrg();
    }
    return CreateScratchOrg.instance;
  }
}

export const createScratchOrg = CreateScratchOrg.getInstance();
