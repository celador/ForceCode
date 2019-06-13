import * as vscode from 'vscode';
import * as commands from './../commands';
import { updateDecorations } from '../decorators/testCoverageDecorator';
import { getFileName, getToolingType } from './../parsers';
import {
  commandService,
  commandViewService,
  codeCovViewService,
  fcConnection,
  dxService,
  FCOauth,
  FCConnection,
  PXMLMember,
  saveService,
} from './../services';
import * as path from 'path';
import { FCFile } from '../services/codeCovView';
import { ToolingType } from '../commands/retrieve';
import { getAnyNameFromUri } from '../parsers/open';
import { Config, IWorkspaceMember } from '../forceCode';
import { readConfigFile, removeConfigFolder } from '../services/configuration';
import { CreateScratchOrg } from '../commands/createScratchOrg';
import { ForcecodeCommand } from '../commands/forcecodeCommand';
import { Find } from '../commands/find';
import { Open } from '../commands/open';
import { CreateClass } from '../commands/createClass';
import { ExecuteAnonymous } from '../commands/executeAnonymous';
import { GetLog } from '../commands/getLog';
import { OverallCoverage } from '../commands/overallCoverage';
import { QueryEditor } from '../commands/queryEditor';
import { CodeCompletionRefresh } from '../commands/codeCompletionRefresh';
import { BulkLoader } from '../commands/bulkLoader';
import { Settings } from '../commands/settings';
import { ForceCodeMenu } from '../commands/menu';
import { ApexTest } from '../commands/apexTest';

// TODO: Classify all commands and place them in their proper files...even the small ones for the context menu

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
  new (class OpenContext extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.open';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return commandService.runCommand('ForceCode.openMenu', context, selectedResource);
    }
  })(),
  new CreateClass(),
  new ExecuteAnonymous(),
  new (class ExecuteAnonymousContext extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.executeAnonymous';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return commandService.runCommand('ForceCode.executeAnonymousMenu', context, selectedResource);
    }
  })(),
  new GetLog(),
  new OverallCoverage(),
  new QueryEditor(),
  new CreateScratchOrg(),
  // TODO: Classify diff.ts
  new (class DiffMenu extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.diffMenu';
      this.name = 'Diffing file'; //+ getFileName(vscode.window.activeTextEditor.document),
      this.hidden = false;
      this.description = 'Diff the current file with what is on the server';
      this.detail = 'Diff the file';
      this.icon = 'diff';
      this.label = 'Diff';
    }

    public command(context, selectedResource?) {
      if (selectedResource && selectedResource.path) {
        return vscode.workspace.openTextDocument(selectedResource).then(doc => commands.diff(doc));
      }
      if (!vscode.window.activeTextEditor) {
        return;
      }
      const ttype: string | undefined = getToolingType(vscode.window.activeTextEditor.document);
      if (!ttype) {
        throw { message: 'Metadata type not supported for diffing' };
      }
      return commands.diff(
        vscode.window.activeTextEditor.document,
        ttype === 'AuraDefinition' || ttype === 'LightningComponentResource'
      );
    }
  })(),
  new (class DiffContext extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.diff';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return commandService.runCommand('ForceCode.diffMenu', context, selectedResource);
    }
  })(),
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
  new (class CompileMenu extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.compileMenu';
      this.name = 'Saving ';
      this.hidden = false;
      this.description = 'Save the active file to your org.';
      this.detail =
        'If there is an error, you will get notified. To automatically compile Salesforce files on save, set the autoCompile flag to true in your settings file';
      this.icon = 'rocket';
      this.label = 'Compile/Deploy';
    }

    public command(context, selectedResource?) {
      if (context) {
        if (context.uri) {
          context = context.uri;
        }
        return vscode.workspace.openTextDocument(context).then(doc => {
          return saveService.saveFile(doc, selectedResource);
        });
      }
      if (!vscode.window.activeTextEditor) {
        return;
      }
      return saveService.saveFile(vscode.window.activeTextEditor.document, selectedResource);
    }
  })(),
  new (class CompileContext extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.compile';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return commandService.runCommand('ForceCode.compileMenu', context, false);
    }
  })(),
  new (class ForceCompile extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.forceCompile';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return commandService.runCommand('ForceCode.compileMenu', context, true);
    }
  })(),
  // TODO: Classify static resource commands (2 of them)
  new (class StaticResourceBundle extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.staticResourceMenu';
      this.name = 'Retrieving static resource';
      this.hidden = false;
      this.description = 'Build and Deploy a resource bundle.';
      this.detail =
        'Create the Static Resource from the resource-bundle folder and deploy it to your org.';
      this.icon = 'file-zip';
      this.label = 'Build Resource Bundle';
    }

    public command(context, selectedResource?) {
      return commands.staticResource(context);
    }
  })(),
  new (class StaticResourceBundleContext extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.staticResource';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return commandService.runCommand('ForceCode.staticResourceMenu', context, selectedResource);
    }
  })(),
  // TODO: Classify packageBuilder
  new (class StaticResourceBundleContext extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.buildPackage';
      this.name = 'Building package.xml';
      this.hidden = false;
      this.description = 'Build a package.xml file and choose where to save it.';
      this.detail =
        'You will be able to choose the types to include in your package.xml (Only does * for members)';
      this.icon = 'jersey';
      this.label = 'Build package.xml file';
    }

    public command(context, selectedResource?) {
      return commands.packageBuilder(true);
    }
  })(),
  // TODO: Classify retrieve (It is used a lot of places)
  new (class RetrieveBundle extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.retrievePackage';
      this.name = 'Retrieving package';
      this.hidden = false;
      this.description = 'Retrieve metadata to your src directory.';
      this.detail =
        'You can choose to retrieve by your package.xml, retrieve all metadata, or choose which types to retrieve.';
      this.icon = 'cloud-download';
      this.label = 'Retrieve Package/Metadata';
    }

    public command(context, selectedResource?) {
      return commands.retrieve(context);
    }
  })(),
  // TODO: Classify deploy
  new (class DeployPackage extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.deployPackage';
      this.name = 'Deploying package';
      this.hidden = false;
      this.description = 'Deploy your package.';
      this.detail = 'Deploy from a package.xml file or choose files to deploy';
      this.icon = 'package';
      this.label = 'Deploy Package';
    }

    public command(context, selectedResource?) {
      return commands.deploy(context);
    }
  })(),
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
  new (class RefreshContext extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.refresh';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return commandService.runCommand('ForceCode.refreshContext', context, selectedResource);
    }
  })(),
  new (class Refresh extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.refreshContext';
      this.name = 'Retrieving ';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      if (selectedResource && selectedResource instanceof Array) {
        return new Promise((resolve, reject) => {
          var files: PXMLMember[] = [];
          var proms: Promise<PXMLMember>[] = selectedResource.map(curRes => {
            if (curRes.fsPath.startsWith(vscode.window.forceCode.projectRoot + path.sep)) {
              return getAnyNameFromUri(curRes);
            } else {
              throw {
                message:
                  "Only files/folders within the current org's src folder (" +
                  vscode.window.forceCode.projectRoot +
                  ') can be retrieved/refreshed.',
              };
            }
          });
          Promise.all(proms).then(theNames => {
            theNames.forEach(curName => {
              var index: number = getTTIndex(curName.name, files);
              if (index >= 0) {
                if (curName.members === ['*']) {
                  files[index].members = ['*'];
                } else {
                  files[index].members.push(...curName.members);
                }
              } else {
                files.push(curName);
              }
            });
            resolve(commands.retrieve({ types: files }));
          });
        });
      }
      if (context) {
        return commands.retrieve(context);
      }
      if (!vscode.window.activeTextEditor) {
        return undefined;
      }
      return commands.retrieve(vscode.window.activeTextEditor.document.uri);

      function getTTIndex(toolType: string, arr: ToolingType[]): number {
        return arr.findIndex(cur => {
          return cur.name === toolType && cur.members !== ['*'];
        });
      }
    }
  })(),
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
  new (class ShowFileOptions extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.showFileOptions';
      this.name = 'Opening file';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return commands.showFileOptions(context);
    }
  })(),
  new ApexTest(),
  new (class FileModified extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.fileModified';
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
              return commands.retrieve(theDoc.uri);
            } else if (s === 'Diff') {
              return commands.diff(theDoc);
            }
          });
      });
    }
  })(),
  new (class StaticResourceDeployFile extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.staticResourceDeployFromFile';
      this.name = 'Saving static resource';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return commands.staticResourceDeployFromFile(selectedResource, context);
    }
  })(),
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
  new (class RunTests extends ForcecodeCommand {
    constructor() {
      super();
      this.commandName = 'ForceCode.runTests';
      this.hidden = true;
    }

    public command(context, selectedResource?) {
      return commandService.runCommand('ForceCode.apexTest', context.name, context.type);
    }
  })(),
  new (class Login extends ForcecodeCommand {
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
      console.log(context);
      return context.execution.cancel();
    }
  })(),
];
