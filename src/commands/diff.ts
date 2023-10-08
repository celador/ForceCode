import * as vscode from 'vscode';
import { ForceCodeContentProvider } from '../providers';
import { ForcecodeCommand } from '.';
import { getToolingTypeFromFolder, getWholeFileName } from '../parsers';

const PROVIDER: string = 'forcecode://salesforce.com';

export class DiffMenu extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.diff';
    this.name = 'Diffing file'; //+ getFileName(vscode.window.activeTextEditor.document),
    this.hidden = false;
    this.description = 'Diff the current file with what is on the server';
    this.detail = 'Diff the file';
    this.icon = 'diff';
    this.label = 'Diff';
  }

  public async command(context?: vscode.Uri) {
    const document: vscode.TextDocument | undefined = context
      ? await vscode.workspace.openTextDocument(context.fsPath)
      : vscode.window.activeTextEditor?.document;
    if (!document) {
      return Promise.reject('No document open to diff with the server.');
    }
    const toolingType: string | undefined = getToolingTypeFromFolder(document.uri);
    if (!toolingType) {
      return Promise.reject('Metadata type not supported for diffing at this time');
    }
    const fileName: string | undefined = getWholeFileName(document);
    if (toolingType === 'AuraDefinition' || toolingType === 'LightningComponentResource') {
      ForceCodeContentProvider.getInstance().auraSource = document;
    }
    try {
      return vscode.commands.executeCommand(
        'vscode.diff',
        vscode.Uri.parse(`${PROVIDER}/${toolingType}/${fileName}?${Date.now()}`),
        document.uri,
        `${fileName} (REMOTE) <~> ${fileName} (LOCAL)`,
        { preview: false }
      );
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
