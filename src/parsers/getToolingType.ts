import * as vscode from 'vscode';
import * as path from 'path';

export default function getToolingTypeFromBody(
  document: vscode.TextDocument,
  member = false
): string | undefined {
  var fileName: string = document.fileName.split('-meta.xml')[0];
  switch (fileName.split('.').pop()) {
    case 'cls':
      return member ? 'ApexClassMember' : 'ApexClass';
    case 'trigger':
      return member ? 'ApexTriggerMember' : 'ApexTrigger';
    case 'component':
      return member ? 'ApexComponentMember' : 'ApexComponent';
    case 'page':
      return member ? 'ApexPageMember' : 'ApexPage';
    default: {
      if (
        fileName.indexOf(`${vscode.window.forceCode.projectRoot}${path.sep}aura${path.sep}`) >= 0
      ) {
        return 'AuraDefinition';
      } else if (
        fileName.indexOf(`${vscode.window.forceCode.projectRoot}${path.sep}lwc${path.sep}`) >= 0
      ) {
        return 'LightningComponentResource';
      }
      return undefined;
    }
  }
}

export function getCoverageType(document: vscode.TextDocument): string | undefined {
  if (document.fileName.endsWith('.cls')) {
    return 'Class';
  }
  if (document.fileName.endsWith('.trigger')) {
    return 'Trigger';
  }
  return undefined;
}

export function getToolingTypeFromExt(thePath: string) {
  switch (path.extname(thePath)) {
    case '.cls':
      return 'ApexClass';
    case '.trigger':
      return 'ApexTrigger';
    case '.component':
      return 'ApexComponent';
    case '.page':
      return 'ApexPage';
    default:
      return undefined;
  }
}
