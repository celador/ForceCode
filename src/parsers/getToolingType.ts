import * as vscode from 'vscode';
import * as path from 'path';
import { IMetadataObject } from '../forceCode';
import { getSrcDir } from '../services/configuration';

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

export function getToolingTypeFromFolder(uri: vscode.Uri): string | undefined {
  let dir: string | undefined = uri.fsPath.split(getSrcDir() + path.sep).pop();
  dir = dir?.split(path.sep).shift();
  switch (dir) {
    case 'classes':
      return 'ApexClass';
    case 'pages':
      return 'ApexPage';
    case 'triggers':
      return 'ApexTrigger';
    case 'aura':
      return 'AuraDefinition';
    case 'components':
      return 'ApexComponent';
    case 'lwc':
      return 'LightningComponentResource';
    default:
      return undefined;
  }
}

export function getAnyTTMetadataFromPath(thepath: string): IMetadataObject | undefined {
  if (thepath.indexOf(getSrcDir()) === -1) {
    return undefined;
  }
  if (!vscode.window.forceCode.describe) {
    return undefined;
  }
  let fileName: string | undefined = thepath.split(getSrcDir() + path.sep).pop();
  if (!fileName) {
    return undefined;
  }
  let baseDirectoryName: string = fileName.split(path.sep)[0];
  let ext: string | undefined = fileName.split('-meta.xml')[0].split('.').pop();
  ext = ext === baseDirectoryName ? undefined : ext;
  return vscode.window.forceCode.describe.metadataObjects.find(
    (o) => o.directoryName === baseDirectoryName && (ext && o.suffix ? ext === o.suffix : true)
  );
}

export function getToolingTypeMetadata(tType: string): IMetadataObject | undefined {
  if (!vscode.window.forceCode.describe) {
    return undefined;
  }
  return vscode.window.forceCode.describe.metadataObjects.find((o) => {
    const isType = o.xmlName === tType;
    const childTypes = o.childXmlNames;
    let childType;
    if (!isType && childTypes) {
      childType = childTypes.find((t) => t === tType);
    }
    return isType || childType !== undefined;
  });
}
