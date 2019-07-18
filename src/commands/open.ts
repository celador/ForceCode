import * as vscode from 'vscode';
import * as retrieve from './retrieve';
import { getIcon, getExtension, getFolder } from './../parsers';
import * as path from 'path';
import { isEmptyUndOrNull } from '../util';
import { ForcecodeCommand, FCCancellationToken } from './forcecodeCommand';
const TYPEATTRIBUTE: string = 'type';

export class ShowFileOptions extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.showFileOptions';
    this.cancelable = true;
    this.name = 'Opening file';
    this.hidden = true;
  }

  public command(context, selectedResource?) {
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

  public command(context: any, selectedResource: any): any {
    return Promise.resolve(vscode.window.forceCode)
      .then(getFileList)
      .then(proms => showFileOptions(proms, this.cancellationToken));

    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function getFileList() {
      var metadataTypes: string[] = [
        'ApexClass',
        'ApexTrigger',
        'ApexPage',
        'ApexComponent',
        'StaticResource',
      ];
      var predicate: string = `WHERE NamespacePrefix = '${
        vscode.window.forceCode.config.prefix ? vscode.window.forceCode.config.prefix : ''
      }'`;
      var promises: any[] = metadataTypes.map(t => {
        var sResource = t === 'StaticResource' ? ', ContentType' : '';
        var q: string = `SELECT Id, Name, NamespacePrefix${sResource} FROM ${t} ${predicate}`;
        return vscode.window.forceCode.conn.tooling.query(q);
      });
      promises.push(
        vscode.window.forceCode.conn.tooling.query(
          'SELECT Id, DeveloperName, NamespacePrefix, Description FROM AuraDefinitionBundle ' +
            predicate
        )
      );
      if (
        vscode.window.forceCode.config.apiVersion &&
        parseInt(vscode.window.forceCode.config.apiVersion) >= 45
      ) {
        promises.push(
          vscode.window.forceCode.conn.tooling.query(
            'SELECT Id, DeveloperName, NamespacePrefix, Description FROM LightningComponentBundle ' +
              predicate
          )
        );
      }
      return promises;
    }
  }
}

export function showFileOptions(promises: any[], cancellationToken: FCCancellationToken) {
  return Promise.all(promises)
    .then(results => {
      let options: vscode.QuickPickItem[] = results
        .map(res => res.records)
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
    .then(opt => {
      var opts: any = opt;
      if (isEmptyUndOrNull(opts)) {
        return Promise.resolve();
      }
      var files: retrieve.ToolingType[] = [];
      if (!(opts instanceof Array)) {
        opts = [opts];
      }
      opts.forEach((curOpt: any) => {
        var tType: string = curOpt.detail.split(' ')[0];
        var fName: string = curOpt.label.slice(curOpt.label.lastIndexOf(' ') + 1).split('.')[0];
        var index: number = getTTIndex(tType, files);
        if (index >= 0) {
          files[index].members.push(fName);
        } else {
          files.push({ name: tType, members: [fName] });
        }
      });

      return retrieve.default({ types: files }, cancellationToken).then((res: any) => {
        if (vscode.workspace.getConfiguration('force')['showFilesOnOpen']) {
          // open the files in the editor
          var filesOpened: number = 0;
          return opts.forEach((curFile: any) => {
            if (
              !cancellationToken.isCanceled() &&
              filesOpened < vscode.workspace.getConfiguration('force')['showFilesOnOpenMax']
            ) {
              var tType: string = curFile.detail.split(' ')[0];
              if (
                tType !== 'AuraDefinitionBundle' &&
                tType !== 'StaticResource' &&
                tType != 'LightningComponentBundle'
              ) {
                filesOpened++;
                var fName: string = curFile.label
                  .slice(curFile.label.lastIndexOf(' ') + 1)
                  .split('.')[0];
                var filePath: string = `${vscode.window.forceCode.projectRoot}${
                  path.sep
                }${getFolder(tType)}${path.sep}${fName}.${getExtension(tType)}`;
                vscode.workspace.openTextDocument(filePath).then(document => {
                  vscode.window.showTextDocument(document, { preview: false });
                });
              }
            }
          });
        }
        return res;
      });
    });

  function getTTIndex(toolType: string, arr: retrieve.ToolingType[]): number {
    return arr.findIndex(cur => {
      return cur.name === toolType;
    });
  }
}
