import * as vscode from 'vscode';
import { getIcon, getExtension, getFolder } from '../parsers';
import * as path from 'path';
import { isEmptyUndOrNull, toArray } from '../util';
import { ForcecodeCommand, FCCancellationToken, ToolingType, retrieve } from '.';
import { getVSCodeSetting } from '../services';
import { getAPIVersion, getSrcDir, VSCODE_SETTINGS } from '../services/configuration';
import { getTTIndex } from './retrieve';
const TYPEATTRIBUTE: string = 'type';

export class ShowFileOptions extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.showFileOptions';
    this.cancelable = true;
    this.name = 'Opening file';
    this.hidden = true;
  }

  public command(context: any[]) {
    return showFileOptions(context, this.cancellationToken);
  }
}

export class Open extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.open';
    this.cancelable = true;
    this.name = 'Opening file';
    this.hidden = false;
    this.description =
      'Open Classes, Pages, Triggers, Components, Lightning Components, and Static Resources';
    this.detail = 'Retrieve a file from Salesforce.';
    this.icon = 'desktop-download';
    this.label = 'Open Salesforce File';
  }

  public command(): any {
    return Promise.resolve(vscode.window.forceCode)
      .then(getFileList)
      .then((proms) => showFileOptions(proms, this.cancellationToken));

    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function getFileList() {
      let metadataTypes: string[] = [
        'ApexClass',
        'ApexTrigger',
        'ApexPage',
        'ApexComponent',
        'StaticResource',
      ];
      let predicate: string = `WHERE NamespacePrefix = '${
        vscode.window.forceCode.config.prefix || ''
      }'`;
      let promises: any[] = metadataTypes.map((t) => {
        let sResource = t === 'StaticResource' ? ', ContentType' : '';
        let q: string = `SELECT Id, Name, NamespacePrefix${sResource} FROM ${t} ${predicate} ORDER BY Name`;
        return vscode.window.forceCode.conn.tooling.query(q);
      });
      promises.push(
        vscode.window.forceCode.conn.tooling.query(
          `SELECT Id, DeveloperName, NamespacePrefix, Description FROM AuraDefinitionBundle ${predicate} ORDER BY DeveloperName`
        )
      );
      if (parseInt(getAPIVersion()) >= 45) {
        promises.push(
          vscode.window.forceCode.conn.tooling.query(
            `SELECT Id, DeveloperName, NamespacePrefix, Description FROM LightningComponentBundle ${predicate} ORDER BY DeveloperName`
          )
        );
      }
      if (vscode.window.forceCode.config.isDeveloperEdition && parseInt(getAPIVersion()) >= 47) {
        promises.push(
          vscode.window.forceCode.conn.tooling.query(
            `SELECT Id, DeveloperName, NamespacePrefix, Description FROM LightningMessageChannel ${predicate} ORDER BY DeveloperName`
          )
        );
      }
      return promises;
    }
  }
}

function showFileOptions(promises: any[], cancellationToken: FCCancellationToken) {
  return Promise.all(promises)
    .then((results) => {
      let options: vscode.QuickPickItem[] = results
        .map((res) => res.records)
        .reduce((prev, curr) => {
          return prev.concat(curr);
        })
        .map((record: any) => {
          let toolingType: string = record.attributes[TYPEATTRIBUTE];
          let icon: string = getIcon(toolingType);
          let ext: string = getExtension(toolingType);
          let name: string = record.Name || record.DeveloperName;
          let sr: string = record.ContentType || '';
          return {
            description: `${record.Id}`,
            detail: `${record.attributes[TYPEATTRIBUTE]} ${sr}`,
            label: `$(${icon}) - ${name}.${ext}`,
          };
        });
      let config: {} = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Retrieve a Salesforce File',
        canPickMany: true,
      };
      return vscode.window.showQuickPick(options, config);
    })
    .then((opt) => {
      let opts: any = opt;
      if (isEmptyUndOrNull(opts)) {
        return Promise.resolve();
      }
      let files: ToolingType[] = [];
      opts = toArray(opts);
      opts.forEach((curOpt: any) => {
        let tType: string = curOpt.detail.split(' ')[0];
        let fName: string = curOpt.label.slice(curOpt.label.lastIndexOf(' ') + 1).split('.')[0];
        let index: number = getTTIndex(tType, files);
        if (index >= 0) {
          files[index].members.push(fName);
        } else {
          files.push({ name: tType, members: [fName] });
        }
      });

      return retrieve({ types: files }, cancellationToken).then((res: any) => {
        if (getVSCodeSetting(VSCODE_SETTINGS.showFilesOnOpen)) {
          // open the files in the editor
          let filesOpened: number = 0;
          return opts.forEach((curFile: any) => {
            if (
              !cancellationToken.isCanceled() &&
              filesOpened < getVSCodeSetting(VSCODE_SETTINGS.showFilesOnOpenMax)
            ) {
              let tType: string = curFile.detail.split(' ')[0];
              if (
                tType !== 'AuraDefinitionBundle' &&
                tType !== 'StaticResource' &&
                tType != 'LightningComponentBundle' &&
                tType != 'LightningMessageChannel'
              ) {
                filesOpened++;
                let fName: string = curFile.label
                  .slice(curFile.label.lastIndexOf(' ') + 1)
                  .split('.')[0];
                let filePath: string = `${getSrcDir()}${path.sep}${getFolder(tType)}${
                  path.sep
                }${fName}.${getExtension(tType)}`;
                vscode.workspace.openTextDocument(filePath).then((document) => {
                  vscode.window.showTextDocument(document, { preview: false });
                });
              }
            }
          });
        }
        return res;
      });
    });
}
