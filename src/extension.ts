import * as vscode from 'vscode';
import {
  ForceService,
  commandViewService,
  codeCovViewService,
  getSetConfig,
  fcConnection,
  isWindows,
  saveService,
  saveHistoryService,
  FCFile,
  trackEvent,
  FCTimer,
} from './services';
import { ApexTestLinkProvider, ForceCodeContentProvider, ForceCodeLogProvider } from './providers';
import { updateDecorations } from './decorators';
import { fcCommands, createProject } from './commands';
import * as path from 'path';
import * as fs from 'fs-extra';
import { getToolingTypeFromFolder } from './parsers';

export function activate(context: vscode.ExtensionContext): any {
  context.subscriptions.push(
    vscode.commands.registerCommand('ForceCode.createProject', createProject)
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

  const startupTimer: FCTimer = new FCTimer('extension.activate');

  fcCommands.forEach((cur) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(cur.commandName, function (
        context: any,
        selectedResource: any
      ): any {
        return commandViewService.addCommandExecution(cur, context, selectedResource);
      })
    );
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
    vscode.window.registerTreeDataProvider('ForceCode.saveHistoryProvider', saveHistoryService)
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
      saveService.addFile(event.document.fileName);
    })
  );

  // AutoCompile Feature
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((textDocument: vscode.TextDocument) => {
      if (vscode.window.forceCode?.config?.autoCompile === true) {
        return vscode.commands.executeCommand('ForceCode.compile', textDocument);
      }
      return undefined;
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(function (event) {
      // clear the code coverage
      let fileName = event.document.fileName;
      // get the id
      const fcfile: FCFile | undefined = codeCovViewService.findByPath(fileName);

      if (fcfile) {
        fcfile.clearCoverage();
        updateDecorations();
      }
    })
  );

  // Text Coverage Decorators
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateDecorations));

  // watch for config file changes
  context.subscriptions.push(
    vscode.workspace
      .createFileSystemWatcher(path.join(vscode.window.forceCode.workspaceRoot, 'force.json'))
      .onDidChange((_uri) => {
        getSetConfig();
      })
  );

  // watch for sfdx-project.json file changes. if it changes, we copy it back into the .forceCode folder for the org
  context.subscriptions.push(
    vscode.workspace
      .createFileSystemWatcher(
        path.join(vscode.window.forceCode.workspaceRoot, 'sfdx-project.json')
      )
      .onDidChange((_uri) => {
        if (vscode.window.forceCode.config.username) {
          fs.copyFileSync(
            path.join(vscode.window.forceCode.workspaceRoot, 'sfdx-project.json'),
            path.join(
              vscode.window.forceCode.workspaceRoot,
              '.forceCode',
              vscode.window.forceCode.config.username,
              'sfdx-project.json'
            )
          );
        }
      })
  );

  // watch for deleted files and update workspaceMembers
  context.subscriptions.push(
    vscode.workspace
      .createFileSystemWatcher(
        path.join(vscode.window.forceCode.projectRoot, '**', '*.{cls,trigger,page,component}')
      )
      .onDidDelete((uri) => {
        const fcfile: FCFile | undefined = codeCovViewService.findByPath(uri.fsPath);

        if (fcfile) {
          codeCovViewService.removeClass(fcfile);
        }
      })
  );

  // need this because windows won't tell us when a dir is removed like linux/mac does above
  if (isWindows()) {
    context.subscriptions.push(
      vscode.workspace
        .createFileSystemWatcher(path.join(vscode.window.forceCode.projectRoot, '*'))
        .onDidDelete((uri) => {
          const tType: string | undefined = getToolingTypeFromFolder(uri);
          if (tType) {
            const fcfiles: FCFile[] | undefined = codeCovViewService.findByType(tType);
            if (fcfiles) {
              codeCovViewService.removeClasses(fcfiles);
            }
          }
        })
    );
  }
  vscode.commands.executeCommand('setContext', 'ForceCodeShowMenu', true);
  trackEvent('Extension starts', 'Started');
  startupTimer.stopTimer();
}
