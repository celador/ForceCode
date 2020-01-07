import { retrieve, ForcecodeCommand, getAnyNameFromUri } from '.';
import * as vscode from 'vscode';
import {
  fcConnection,
  codeCovViewService,
  FCOauth,
  FCConnection,
  commandViewService,
  dxService,
  notifications,
  FCFile,
  ClassType,
  PXMLMember,
} from '../services';
import { getFileName } from '../parsers';
import { readConfigFile, removeConfigFolder } from '../services';
import { Config } from '../forceCode';
import { updateDecorations } from '../decorators';
import * as path from 'path';
import * as fs from 'fs-extra';

export class ToolingQuery extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.toolingQuery';
    this.hidden = true;
  }

  public command(context: string) {
    return vscode.window.forceCode.conn.tooling.query(context);
  }
}

export class CreateProject extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.createProjectMenu';
    this.name = 'Creating new project';
    this.hidden = false;
    this.description = 'Create new project';
    this.detail = 'Create a new Forcecode project in a folder you select.';
    this.icon = 'file-directory';
    this.label = 'New Project';
  }

  public command() {
    return vscode.commands.executeCommand('ForceCode.createProject');
  }
}

export class Logout extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.logout';
    this.name = 'Logging out';
    this.hidden = false;
    this.description = 'Log out from current org';
    this.detail = 'Log out of the current org in this project.';
    this.icon = 'x';
    this.label = 'Log out of Salesforce';
  }

  public command(context: FCConnection | undefined) {
    var conn = context || fcConnection.currentConnection;
    return fcConnection.disconnect(conn);
  }
}

export class SwitchUser extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.switchUser';
    this.cancelable = true;
    this.name = 'Logging in';
    this.hidden = false;
    this.description = 'Enter the credentials you wish to use.';
    this.detail = 'Log into an org not in the saved usernames list.';
    this.icon = 'key';
    this.label = 'Log in to Salesforce';
  }

  public command(context: FCOauth | FCConnection) {
    codeCovViewService.clear();
    var orgInfo: FCOauth;
    if (context instanceof FCConnection) {
      orgInfo = context.orgInfo;
    } else {
      orgInfo = context;
    }
    return fcConnection.connect(orgInfo, this.cancellationToken);
  }
}

export class FileModified extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.fileModified';
    this.cancelable = true;
    this.name = 'Modified file';
    this.hidden = true;
  }

  public command(context: vscode.Uri, selectedResource: string) {
    return vscode.workspace.openTextDocument(context).then(theDoc => {
      return notifications
        .showWarning(
          selectedResource + ' has changed ' + getFileName(theDoc),
          'Refresh',
          'Diff',
          'Dismiss'
        )
        .then(s => {
          if (s === 'Refresh') {
            return retrieve(theDoc.uri, this.cancellationToken);
          } else if (s === 'Diff') {
            return vscode.commands.executeCommand('ForceCode.diff', theDoc);
          }
        });
    });
  }
}

export class CheckForFileChanges extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.checkForFileChanges';
    this.name = 'Getting workspace information';
    this.hidden = true;
  }

  public command() {
    return vscode.window.forceCode.checkForFileChanges();
  }
}

export class ShowTasks extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.showTasks';
    this.name = 'Show tasks';
    this.hidden = true;
  }

  public command() {
    if (fcConnection.isLoggedIn()) {
      var treePro = vscode.window.createTreeView('ForceCode.treeDataProvider', {
        treeDataProvider: commandViewService,
      });
      return treePro.reveal(commandViewService.getChildren()[0]);
    }
  }
}

export class OpenOnClick extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.openOnClick';
    this.name = 'Open From TestCov view';
    this.hidden = true;
  }

  public command(context: string) {
    return vscode.workspace
      .openTextDocument(context)
      .then(doc => vscode.window.showTextDocument(doc, { preview: false }));
  }
}

export class ChangeCoverageDecoration extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.changeCoverageDecoration';
    this.name = 'Change Coverage Decoration';
    this.hidden = true;
  }

  public command(context: FCFile) {
    var parent = context.getParentFCFile() || context;
    if (context.label) {
      var newCoverage = context.label.split(' ').pop();
      if (parent === context) {
        newCoverage = 'overall';
      }
      if (
        parent.getType() === ClassType.CoveredClass ||
        parent.getType() === ClassType.UncoveredClass
      ) {
        // turn on line decorations when user clicks the class
        vscode.window.forceCode.config.showTestCoverage = true;
      }
      return vscode.workspace
        .openTextDocument(parent.getWsMember().path)
        .then(doc => vscode.window.showTextDocument(doc, { preview: false }))
        .then(_res => {
          parent.setCoverageTestClass(newCoverage);
          return updateDecorations();
        });
    }
  }
}

export class Login extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.login';
    this.hidden = true;
  }

  public command(context: FCOauth | FCConnection) {
    var orgInfo: FCOauth;
    if (context instanceof FCConnection) {
      orgInfo = context.orgInfo;
    } else {
      orgInfo = context;
    }
    const cfg: Config = readConfigFile(orgInfo.username);
    return dxService.login(cfg.url, this.cancellationToken).then(res => {
      return vscode.commands.executeCommand('ForceCode.switchUser', res);
    });
  }
}

export class RemoveConfig extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.removeConfig';
    this.hidden = true;
  }

  public command(context: string | FCConnection) {
    var username: string;
    if (context instanceof FCConnection) {
      username = context.orgInfo.username;
    } else {
      username = context;
    }
    return notifications
      .showWarning(
        'This will remove the .forceCode/' + username + ' folder and all contents. Continue?',
        'Yes',
        'No'
      )
      .then(s => {
        if (s === 'Yes') {
          if (removeConfigFolder(username)) {
            return notifications.showInfo(
              '.forceCode/' + username + ' folder removed successfully',
              'OK'
            );
          } else {
            return notifications.showInfo('.forceCode/' + username + ' folder not found', 'OK');
          }
        }
      })
      .then(() => {
        const conn: FCConnection | undefined = fcConnection.getConnByUsername(username);
        return fcConnection.disconnect(conn);
      });
  }
}

export class DeleteFile extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.deleteFile';
    this.name = 'Deleting ';
    this.hidden = true;
  }

  // selectedResource = Array (multiple files) right click via explorer
  // context = right click in file or explorer
  // command pallette => both undefined, so check current open file
  public async command(context?: vscode.Uri, selectedResource?: vscode.Uri[]) {
    var toDelete: Set<PXMLMember> = new Set<PXMLMember>();
    var filesToDelete: Set<vscode.Uri> = new Set<vscode.Uri>();
    // check that file is in the project and get tooling type
    if (selectedResource) {
      selectedResource.forEach(resource => {
        filesToDelete.add(resource);
      });
    } else if (context) {
      filesToDelete.add(context);
    } else {
      if (!vscode.window.activeTextEditor) {
        return undefined;
      }
      filesToDelete.add(vscode.window.activeTextEditor.document.uri);
    }

    if (filesToDelete.size === 0) {
      return undefined;
    }

    await new Promise((resolve, reject) => {
      var count = 0;
      filesToDelete.forEach(async resource => {
        const toAdd = await getAnyNameFromUri(resource, true).catch(reject);
        if (toAdd) {
          if (toAdd.defType) {
            toAdd.name = 'AuraDefinition';
          }
          toDelete.add(toAdd);
        }
        count++;
        if (count === filesToDelete.size) resolve();
      });
    });

    if (toDelete.size === 0) {
      return undefined;
    }

    var toDeleteNames: string = 'Are you sure you want to delete the following?\n';
    toDelete.forEach(cur => {
      cur.members.forEach(mem => {
        toDeleteNames += mem + (cur.defType ? ' ' + cur.defType : '') + ': ' + cur.name + '\n';
      });
    });

    // ask user if they're sure
    const choice: string | undefined = await vscode.window.showWarningMessage(
      toDeleteNames,
      { modal: true },
      'Yes'
    );

    if (choice !== 'Yes') {
      return undefined;
    }

    // delete file(s) from org
    await new Promise((resolve, reject) => {
      var count = 0;
      toDelete.forEach(async cur => {
        await vscode.window.forceCode.conn.tooling
          .sobject(cur.name)
          .find({
            DefType: cur.defType,
            'AuraDefinitionBundle.DeveloperName': cur.defType ? cur.members[0] : undefined,
            'AuraDefinitionBundle.NamespacePrefix': cur.defType
              ? vscode.window.forceCode.config.prefix || ''
              : undefined,
            DeveloperName: cur.defType
              ? undefined
              : !cur.name.startsWith('Apex')
              ? cur.members[0]
              : undefined,
            Name: cur.defType
              ? undefined
              : cur.name.startsWith('Apex')
              ? cur.members[0]
              : undefined,
            NamespacePrefix: cur.defType ? undefined : vscode.window.forceCode.config.prefix || '',
          })
          .execute(async function(_err: any, records: any) {
            var toDeleteString: string[] = new Array<string>();
            if (!records || records.length === 0) {
              return reject(cur.members[0] + ' ' + cur.name + ' not found in the org');
            }
            records.forEach((rec: any) => {
              toDeleteString.push(rec.Id);
            });
            await vscode.window.forceCode.conn.tooling
              .sobject(cur.name)
              .del(toDeleteString)
              .then(
                _res => {},
                _err =>
                  // TODO jsforce has an issue and won't give a proper error message
                  reject(
                    'There was an issue deleting ' +
                      cur.members[0] +
                      ', meaning it is most likely a dependency for other metadata. Try removing ' +
                      cur.members[0] +
                      ' in the org UI instead.'
                  )
              );
          });
        count++;
        if (count === toDelete.size) resolve();
      });
    });

    // ask user if they want to delete from workspace
    const delWSChoice = await notifications.showInfo(
      'Metadata deleted from org. Delete from workspace?',
      'Yes',
      'No'
    );
    if (delWSChoice !== 'Yes') {
      return undefined;
    }

    // delete file(s) from workspace
    filesToDelete.forEach(uri => {
      var thePath: string = uri.fsPath;
      const projPath: string = vscode.window.forceCode.projectRoot + path.sep;
      const isDir: boolean = fs.lstatSync(uri.fsPath).isDirectory();
      const isMetaData: boolean = thePath.endsWith('-meta.xml');
      const metaExists: boolean = fs.existsSync(thePath + '-meta.xml');
      const isLWC: boolean = thePath.indexOf(projPath + 'lwc' + path.sep) !== -1;
      const isAura = thePath.indexOf(projPath + 'aura' + path.sep) !== -1;
      if (!isDir && (isLWC || (isAura && (metaExists || isMetaData)))) {
        thePath = thePath.substring(0, thePath.lastIndexOf(path.sep) + 1);
      }
      // delete the file/folder
      fs.removeSync(thePath);
      if (!isDir && !isLWC && !isAura && metaExists) {
        // delete the meta.xml file
        fs.removeSync(thePath + '-meta.xml');
      }
    });
  }
}
