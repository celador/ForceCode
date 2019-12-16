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

  public command(_context: any, selectedResource?: any) {
    if (selectedResource && selectedResource.path) {
      return vscode.workspace.openTextDocument(selectedResource).then(doc => diff(doc));
    }
    if (!vscode.window.activeTextEditor) {
      return;
    }
    const ttype: string | undefined = getToolingTypeFromFolder(
      vscode.window.activeTextEditor.document.uri
    );
    if (!ttype) {
      throw { message: 'Metadata type not supported for diffing' };
    }
    return diff(
      vscode.window.activeTextEditor.document,
      ttype === 'AuraDefinition' || ttype === 'LightningComponentResource'
    );
  }
}

export default function diff(document: vscode.TextDocument, auraSource?: boolean) {
  if (!document) {
    return Promise.reject('No document open to diff with the server.');
  }
  const toolingType: string | undefined = getToolingTypeFromFolder(document.uri);
  const fileName: string | undefined = getWholeFileName(document);
  if (auraSource) {
    ForceCodeContentProvider.getInstance().auraSource = document;
  }
  return diffFile();
  // =======================================================================================================================================
  // =======================================================================================================================================
  function diffFile() {
    try {
      return vscode.commands.executeCommand(
        'vscode.diff',
        buildSalesforceUriFromLocalUri(),
        document.uri,
        `${fileName} (REMOTE) <~> ${fileName} (LOCAL)`,
        { preview: false }
      );
    } catch (e) {
      return Promise.reject(e);
    }
  }

  function buildSalesforceUriFromLocalUri(): vscode.Uri {
    var sfuri: vscode.Uri = vscode.Uri.parse(
      `${PROVIDER}/${toolingType}/${fileName}?${Date.now()}`
    );
    return sfuri;
  }
  // =======================================================================================================================================

  // =======================================================================================================================================
}
