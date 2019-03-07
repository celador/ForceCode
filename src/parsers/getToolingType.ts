import * as vscode from 'vscode';
import * as path from 'path';

export default function getToolingTypeFromBody(
  document: vscode.TextDocument,
  member = false
): string {
  var fileName: string = document.fileName.split('-meta.xml')[0];
  if (fileName.endsWith('.cls')) {
    return member ? 'ApexClassMember' : 'ApexClass';
  }
  if (fileName.endsWith('.trigger')) {
    return member ? 'ApexTriggerMember' : 'ApexTrigger';
  }
  if (fileName.endsWith('.component')) {
    return member ? 'ApexComponentMember' : 'ApexComponent';
  }
  if (fileName.endsWith('.page')) {
    return member ? 'ApexPageMember' : 'ApexPage';
  }
  if (fileName.indexOf(`${vscode.window.forceCode.config.src}${path.sep}aura`) >= 0) {
    return 'AuraDefinition';
  }
  if (fileName.indexOf(`${vscode.window.forceCode.config.src}${path.sep}lwc`) >= 0) {
    return 'LightningComponentResource';
  }
  return undefined;
}

export function getCoverageType(document: vscode.TextDocument): string {
  if (document.fileName.endsWith('.cls')) {
    return 'Class';
  }
  if (document.fileName.endsWith('.trigger')) {
    return 'Trigger';
  }
  return undefined;
}

export function getToolingTypeFromExt(path: string) {
  if (path.endsWith('.cls')) {
    return 'ApexClass';
  } else if (path.endsWith('.trigger')) {
    return 'ApexTrigger';
  } else if (path.endsWith('.component')) {
    return 'ApexComponent';
  } else if (path.endsWith('.page')) {
    return 'ApexPage';
  }
  return undefined;
}
