import { ForcecodeCommand } from './forcecodeCommand';
import * as vscode from 'vscode';
import {
  fcConnection,
  codeCovViewService,
  FCOauth,
  FCConnection,
  commandViewService,
  dxService,
  notifications,
} from '../services';
import retrieve from './retrieve';
import diff from './diff';
import { getFileName } from '../parsers';
import { readConfigFile, removeConfigFolder } from '../services/configuration';
import { Config } from '../forceCode';

export class ToolingQuery extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.toolingQuery';
    this.hidden = true;
  }

  public command(context, selectedResource?) {
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

  public command(context, selectedResource?) {
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

  public command(context, selectedResource?) {
    var conn = context ? context : fcConnection.currentConnection;
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

  public command(context, selectedResource?) {
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

  public command(context, selectedResource?) {
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
            return diff(theDoc);
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

  public command(context, selectedResource?) {
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

  public command(context, selectedResource?) {
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

  public command(context, selectedResource?) {
    return vscode.workspace
      .openTextDocument(context)
      .then(doc => vscode.window.showTextDocument(doc, { preview: false }));
  }
}

export class Login extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.login';
    this.hidden = true;
  }

  public command(context, selectedResource?) {
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

  public command(context, selectedResource?) {
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
