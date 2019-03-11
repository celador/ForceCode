import * as vscode from 'vscode';
import {
  ForceService,
  commandViewService,
  commandService,
  codeCovViewService,
  configuration,
  fcConnection,
  operatingSystem,
  saveService,
} from './services';
import ForceCodeContentProvider from './providers/ContentProvider';
import ForceCodeLogProvider from './providers/LogProvider';
import {
  editorUpdateApexCoverageDecorator,
  updateDecorations,
} from './decorators/testCoverageDecorator';
import * as commands from './models/commands';
import * as path from 'path';
import { FCFile } from './services/codeCovView';
import { IWorkspaceMember } from './forceCode';
import { ApexTestLinkProvider } from './providers/ApexTestLinkProvider';
import { getToolingTypeFromFolder, getAnyTTFromFolder } from './parsers/open';
import { trackEvent } from './services/fcAnalytics';
import * as fs from 'fs-extra';

export function activate(context: vscode.ExtensionContext): any {
  context.subscriptions.push(
    vscode.commands.registerCommand('ForceCode.createProject', () => {
      vscode.window
        .showInputBox({
          ignoreFocusOut: true,
          placeHolder: 'Enter a Project Name...',
          prompt:
            'A folder with this name will be created inside the folder you select in the next step',
        })
        .then(folderName => {
          if (!folderName || folderName.trim() === '') {
            vscode.window.showErrorMessage(
              'You must enter a project name to create a Forcecode project',
              'OK'
            );
            return;
          }
          folderName = folderName.trim();
          vscode.window
            .showOpenDialog({
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
              openLabel: `Create Folder '${folderName}'`,
            })
            .then(folder => {
              if (!folder) {
                return;
              }
              // create default src folder so sfdx doesn't complain about a bad dir
              const projFolder: string = path.join(folder[0].fsPath, folderName);
              if (!fs.existsSync(path.join(projFolder, 'src'))) {
                fs.mkdirpSync(path.join(projFolder, 'src'));
              }

              // make a dummy sfdx-project.json file so the Salesforce extensions are activated when we open the project folder
              if (!fs.existsSync(path.join(projFolder, 'sfdx-project.json'))) {
                const sfdxProj: {} = {
                  namespace: '',
                  packageDirectories: [
                    {
                      path: 'src',
                      default: true,
                    },
                  ],
                  sfdcLoginUrl: 'https://login.salesforce.com',
                  sourceApiVersion: vscode.workspace.getConfiguration('force')['defaultApiVersion'],
                };

                fs.outputFileSync(
                  path.join(projFolder, 'sfdx-project.json'),
                  JSON.stringify(sfdxProj, undefined, 4)
                );
              }

              // make a dummy force.json to activate Forcecode
              fs.outputFileSync(
                path.join(projFolder, 'force.json'),
                JSON.stringify({ lastUsername: '' }, undefined, 4)
              );
              // open the folder
              vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projFolder));
            });
        });
    })
  );

  if (!vscode.workspace.workspaceFolders) {
    return;
  } else {
    const forcePath: string = path.join(
      vscode.workspace.workspaceFolders[0].uri.fsPath,
      'force.json'
    );
    if (!fs.existsSync(forcePath)) {
      // if there's no force.json then we don't want to fully initialize, otherwise things get wonky
      return;
    }
  }

  process.env.SFDX_JSON_TO_STDOUT = 'true';
  commands.fcCommands.forEach(cur => {
    context.subscriptions.push(vscode.commands.registerCommand(cur.commandName, cur.command));
  });

  vscode.window.forceCode = new ForceService(context);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('ForceCode.switchUserProvider', fcConnection)
  );
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('ForceCode.treeDataProvider', commandViewService)
  );
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('ForceCode.codeCovDataProvider', codeCovViewService)
  );

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('sflog', new ForceCodeLogProvider())
  );
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      'forcecode',
      ForceCodeContentProvider.getInstance()
    )
  );

  let sel: vscode.DocumentSelector = { scheme: 'file', language: 'apex' };
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(sel, new ApexTestLinkProvider())
  );

  // get the pre-save document contents and store them so we can diff with the server
  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument((event: vscode.TextDocumentWillSaveEvent) => {
      saveService.addFile(event.document);
    })
  );

  // AutoCompile Feature
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((textDocument: vscode.TextDocument) => {
      if (vscode.window.forceCode.config && vscode.window.forceCode.config.autoCompile === true) {
        var isResource: RegExpMatchArray = textDocument.fileName.match(
          /resource\-bundles.*\.resource.*$/
        ); // We are in a resource-bundles folder, bundle and deploy the staticResource
        const toolingType: string = getAnyTTFromFolder(textDocument.uri);
        if (textDocument.uri.fsPath.indexOf(vscode.window.forceCode.projectRoot) !== -1) {
          if (isResource && isResource.index) {
            return commandService.runCommand(
              'ForceCode.staticResourceDeployFromFile',
              context,
              textDocument
            );
          }
          if (toolingType) {
            return commandService.runCommand('ForceCode.compileMenu', textDocument);
          }
        } else if (isResource || toolingType) {
          vscode.window.showErrorMessage(
            "The file you are trying to save to the server isn't in the current org's source folder (" +
              vscode.window.forceCode.projectRoot +
              ')'
          );
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(function(event) {
      // clear the code coverage
      var fileName = event.document.fileName;
      // get the id
      const fcfile: FCFile = codeCovViewService.findByPath(fileName);
      var wsMem: IWorkspaceMember = fcfile ? fcfile.getWsMember() : undefined;

      if (wsMem && wsMem.coverage) {
        wsMem.coverage = undefined;
        fcfile.updateWsMember(wsMem);
        updateDecorations();
      }
    })
  );

  // Text Coverage Decorators
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editorUpdateApexCoverageDecorator)
  );

  // watch for config file changes
  context.subscriptions.push(
    vscode.workspace
      .createFileSystemWatcher(path.join(vscode.window.forceCode.workspaceRoot, 'force.json'))
      .onDidChange(uri => {
        configuration();
      })
  );

  // watch for sfdx-project.json file changes. if it changes, we copy it back into the .forceCode folder for the org
  context.subscriptions.push(
    vscode.workspace
      .createFileSystemWatcher(
        path.join(vscode.window.forceCode.workspaceRoot, 'sfdx-project.json')
      )
      .onDidChange(uri => {
        fs.copyFileSync(
          path.join(vscode.window.forceCode.workspaceRoot, 'sfdx-project.json'),
          path.join(
            vscode.window.forceCode.workspaceRoot,
            '.forceCode',
            vscode.window.forceCode.config.username,
            'sfdx-project.json'
          )
        );
      })
  );

  // watch for deleted files and update workspaceMembers
  context.subscriptions.push(
    vscode.workspace
      .createFileSystemWatcher(
        path.join(vscode.window.forceCode.projectRoot, '**', '*.{cls,trigger,page,component,cmp}')
      )
      .onDidDelete(uri => {
        const fcfile: FCFile = codeCovViewService.findByPath(uri.fsPath);

        if (fcfile) {
          codeCovViewService.removeClass(fcfile);
        }
      })
  );

  // need this because windows won't tell us when a dir is removed like linux/mac does above
  if (operatingSystem.isWindows()) {
    context.subscriptions.push(
      vscode.workspace
        .createFileSystemWatcher(path.join(vscode.window.forceCode.projectRoot, '*'))
        .onDidDelete(uri => {
          const tType: string = getToolingTypeFromFolder(uri);
          if (tType) {
            const fcfiles: FCFile[] = codeCovViewService.findByType(tType);
            if (fcfiles) {
              codeCovViewService.removeClasses(fcfiles);
            }
          }
        })
    );
  }
  trackEvent('Extension starts', 'Started');
}
