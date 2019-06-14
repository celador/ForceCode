import * as vscode from 'vscode';
import * as commands from './../commands';
import { updateDecorations } from '../decorators/testCoverageDecorator';
import { getFileName } from './../parsers';
import {
  commandService,
  commandViewService,
  codeCovViewService,
  fcConnection,
  dxService,
  FCOauth,
  FCConnection,
} from './../services';
import * as path from 'path';
import { FCFile } from '../services/codeCovView';
import { RetrieveBundle, RefreshContext, Refresh } from '../commands/retrieve';
import { Config, IWorkspaceMember } from '../forceCode';
import { readConfigFile, removeConfigFolder } from '../services/configuration';
import { CreateScratchOrg } from '../commands/createScratchOrg';
import { ForcecodeCommand } from '../commands/forcecodeCommand';
import { Find } from '../commands/find';
import { Open, OpenContext, ShowFileOptions } from '../commands/open';
import { CreateClass } from '../commands/createClass';
import { ExecuteAnonymous, ExecuteAnonymousContext } from '../commands/executeAnonymous';
import { GetLog } from '../commands/getLog';
import { OverallCoverage } from '../commands/overallCoverage';
import { QueryEditor } from '../commands/queryEditor';
import { CodeCompletionRefresh } from '../commands/codeCompletionRefresh';
import { BulkLoader } from '../commands/bulkLoader';
import { Settings } from '../commands/settings';
import { ForceCodeMenu } from '../commands/menu';
import { ApexTest, RunTests } from '../commands/apexTest';
import { DiffMenu, DiffContext } from '../commands/diff';
import { CompileMenu, CompileContext, ForceCompile } from '../commands/compile';
import {
  StaticResourceBundle,
  StaticResourceBundleContext,
  StaticResourceDeployFile,
} from '../commands/staticResource';
import { PackageBuilder } from '../commands/packageBuilder';
import { DeployPackage } from '../commands/deploy';

// TODO: Find proper homes for the rest of the commands defined in this file

export const fcCommands: ForcecodeCommand[] = [
  new (class OpenOrg extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.openOrg';
      this.name = 'Opening org in browser';
      this.hidden = false;
      this.description = 'Open project org';
      this.detail = 'Open the org this project is associated with in a browser.';
      this.icon = 'browser';
      this.label = 'Open Org in browser';
    }

    public command(context, selectedResource?) {
      return dxService.openOrg();
    }
  })(),
  new Find(),
  new Open(),
  new OpenContext(),
  new CreateClass(),
  new ExecuteAnonymous(),
  new ExecuteAnonymousContext(),
  new GetLog(),
  new OverallCoverage(),
  new QueryEditor(),
  new CreateScratchOrg(),
  new DiffMenu(),
  new DiffContext(),
  new (class ToolingQuery extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.toolingQuery';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return vscode.window.forceCode.conn.tooling.query(context);
    }
  })(),
  new CompileMenu(),
  new CompileContext(),
  new ForceCompile(),
  new StaticResourceBundle(),
  new StaticResourceBundleContext(),
  new PackageBuilder(),
  new RetrieveBundle(),
  new DeployPackage(),
  new CodeCompletionRefresh(),
  new BulkLoader(),
  new Settings(),
  // TODO we can't classify this at the moment because it lives in extension.ts
  new (class CreateProject extends ForcecodeCommand {
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
  })(),
  new (class Logout extends ForcecodeCommand {
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
  })(),
  new (class SwitchUser extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.switchUserText';
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
  })(),
  new (class SwitchUserContext extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.switchUser';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return commandService.runCommand('ForceCode.switchUserText', context, selectedResource);
    }
  })(),
  new RefreshContext(),
  new Refresh(),
  new ForceCodeMenu(),
  new (class ToggleCoverage extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.toggleCoverage';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      vscode.window.forceCode.config.showTestCoverage = !vscode.window.forceCode.config
        .showTestCoverage;
      return updateDecorations();
    }
  })(),
  new (class PreviewVisualforce extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.previewVF';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      var vfFileNameSplit = context.fsPath.split(path.sep);
      var vfFileName = vfFileNameSplit[vfFileNameSplit.length - 1].split('.')[0];
      return dxService.openOrgPage('/apex/' + vfFileName);
    }
  })(),
  new (class PreviewApp extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.previewApp';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      var appFileNameSplit = context.fsPath.split(path.sep);
      var appFileName = appFileNameSplit[appFileNameSplit.length - 1];
      return dxService.openOrgPage('/c/' + appFileName);
    }
  })(),
  new (class OpenFileInOrg extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.openFileInOrg';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      var id: string | undefined;
      if (context) {
        if (context.fsPath) {
          var filePath = context.fsPath;
          const fcfile: FCFile | undefined = codeCovViewService.findByPath(filePath);
          const member: IWorkspaceMember | undefined = fcfile ? fcfile.getWsMember() : undefined;
          if (member) {
            id = member.id;
          }
        } else {
          id = context;
        }
      }
      if (id) {
        return dxService.openOrgPage('/' + id);
      } else {
        return Promise.resolve();
      }
    }
  })(),
  new ShowFileOptions(),
  new ApexTest(),
  new (class FileModified extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.fileModified';
      this.cancelable = true;
      this.name = 'Modified file';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return vscode.workspace.openTextDocument(context).then(theDoc => {
        return vscode.window
          .showWarningMessage(
            selectedResource + ' has changed ' + getFileName(theDoc),
            'Refresh',
            'Diff',
            'Dismiss'
          )
          .then(s => {
            if (s === 'Refresh') {
              return commands.retrieve(theDoc.uri, this.cancellationToken);
            } else if (s === 'Diff') {
              return commands.diff(theDoc);
            }
          });
      });
    }
  })(),
  new StaticResourceDeployFile(),
  new (class CheckForFileChanges extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.checkForFileChanges';
      this.name = 'Getting workspace information';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return vscode.window.forceCode.checkForFileChanges();
    }
  })(),
  new (class ShowTasks extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.showTasks';
      this.name = 'Show tasks';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      var treePro = vscode.window.createTreeView('ForceCode.treeDataProvider', {
        treeDataProvider: commandViewService,
      });
      return treePro.reveal(commandViewService.getChildren()[0]);
    }
  })(),
  new (class OpenOnClick extends ForcecodeCommand {
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
  })(),
  new (class GetCodeCoverage extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.getCodeCoverage';
      this.name = 'Retrieving code coverage';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return commands.apexTestResults();
    }
  })(),
  new RunTests(),
  new (class Login extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.login';
      this.name = 'Logging in';
      this.cancelable = true;
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
        return commandService.runCommand('ForceCode.switchUserText', res);
      });
    }
  })(),
  new (class RemoveConfig extends ForcecodeCommand {
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
      return vscode.window
        .showWarningMessage(
          'This will remove the .forceCode/' + username + ' folder and all contents. Continue?',
          'Yes',
          'No'
        )
        .then(s => {
          if (s === 'Yes') {
            if (removeConfigFolder(username)) {
              return vscode.window.showInformationMessage(
                '.forceCode/' + username + ' folder removed successfully',
                'OK'
              );
            } else {
              return vscode.window.showInformationMessage(
                '.forceCode/' + username + ' folder not found',
                'OK'
              );
            }
          }
        })
        .then(() => {
          const conn: FCConnection | undefined = fcConnection.getConnByUsername(username);
          return fcConnection.disconnect(conn);
        });
    }
  })(),
  new (class CancelCommand extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.cancelCommand';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return context.execution.cancel();
    }
  })(),
];
