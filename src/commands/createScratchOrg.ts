import * as vscode from 'vscode';
import { dxService, fcConnection } from '../services';
import { Config } from '../forceCode';
import { defaultOptions, saveConfigFile } from '../services';
import { ForcecodeCommand, FCCancellationToken } from '.';

interface ScratchOrgOptions {
  definitionFile?: string;
  edition: string;
  duration: string;
  sampleData: boolean;
}

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

  public async command(): Promise<any> {
    const soOptions: ScratchOrgOptions = {
      edition: '',
      duration: '',
      sampleData: false,
    };

    const fileOrChoice = await askNoYes('Create org based off of a definition file?');
    if (fileOrChoice === undefined) {
      return Promise.resolve();
    } else if (fileOrChoice) {
      // select a definition file
      soOptions.definitionFile = await selectDefinitionFile();
      if (soOptions.definitionFile === undefined) {
        return Promise.resolve();
      }
    } else {
      // choose how to set up org
      const edition = await selectEdition();
      if (edition === undefined) {
        return Promise.resolve();
      }
      soOptions.edition = edition;
      const duration = await selectDays();
      if (duration === undefined) {
        return Promise.resolve();
      }
      soOptions.duration = duration;
      const sampleData = await askNoYes('Create org with sample data?');
      if (sampleData === undefined) {
        return Promise.resolve();
      }
      soOptions.sampleData = sampleData;
    }

    return createOrg(this.cancellationToken);

    function selectDefinitionFile(): Thenable<string | undefined> {
      return vscode.window
        .showOpenDialog({ filters: { JSON: ['json'] }, canSelectMany: false })
        .then(fileArr => {
          return fileArr && fileArr.length > 0 ? fileArr[0].fsPath : undefined;
        });
    }

    function selectEdition(): Thenable<string | undefined> {
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
      return vscode.window.showQuickPick(options, config).then(choice => {
        return choice?.label;
      });
    }

    function selectDays(): Thenable<string | undefined> {
      let durOpts: vscode.QuickPickItem[] = [];
      for (let i = 1; i < 31; i++) {
        durOpts.push({ label: String(i) });
      }

      let config: vscode.QuickPickOptions = {
        placeHolder: 'Days until org expires...',
      };
      return vscode.window.showQuickPick(durOpts, config).then(choice => {
        return choice?.label;
      });
    }

    function askNoYes(prompt: string): Thenable<boolean | undefined> {
      let sDataOptions: vscode.QuickPickItem[] = [
        {
          label: 'No',
        },
        {
          label: 'Yes',
        },
      ];

      let config: vscode.QuickPickOptions = {
        placeHolder: prompt,
      };
      return vscode.window.showQuickPick(sDataOptions, config).then(choice => {
        return choice?.label === 'Yes';
      });
    }

    function createOrg(cancellationToken: FCCancellationToken) {
      let theOptions: string;
      if (!soOptions.definitionFile) {
        theOptions =
          '--durationdays ' +
          soOptions.duration +
          ` edition=${soOptions.edition} hasSampleData=${soOptions.sampleData}`;
      } else {
        theOptions = '--definitionfile ' + soOptions.definitionFile;
      }
      return dxService.createScratchOrg(theOptions, cancellationToken).then(res => {
        let scratchConfig: Config = defaultOptions;
        scratchConfig.username = res.username;
        saveConfigFile(res.username, scratchConfig);
        fcConnection.refreshConnections();
      });
    }
  }
}
