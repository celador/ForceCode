import * as vscode from 'vscode';
import * as parsers from './../parsers';
import ForceCodeContentProvider from '../providers/ContentProvider';

const PROVIDER: string = 'forcecode://salesforce.com';

export default function diff(document: vscode.TextDocument, auraSource?: boolean) {
  if (!document) {
    return Promise.reject('No document open to diff with the server.');
  }
  const toolingType: string | undefined = parsers.getToolingType(document);
  const fileName: string | undefined = parsers.getWholeFileName(document);
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
