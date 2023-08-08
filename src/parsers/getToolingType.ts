import * as vscode from 'vscode';
import * as path from 'path';
import { IMetadataObject } from '../forceCode';
import { getSrcDir } from '../services/configuration';

export function getCoverageType(document: vscode.TextDocument): string | undefined {
  const ext = document.fileName.split('.').pop();
  return ext === 'cls' ? 'Class' : ext === 'trigger' ? 'Trigger' : undefined;
}

export function getToolingTypeFromExt(thePath: string) {
  const ext = path.extname(thePath);
  return ext === '.cls'
    ? 'ApexClass'
    : ext === '.trigger'
    ? 'ApexTrigger'
    : ext === '.component'
    ? 'ApexComponent'
    : ext === '.page'
    ? 'ApexPage'
    : undefined;
}

export function getToolingTypeFromFolder(uri: vscode.Uri): string | undefined {
  const dir = uri.fsPath
    .split(getSrcDir() + path.sep)
    .pop()
    ?.split(path.sep)
    .shift();
  return dir === 'classes'
    ? 'ApexClass'
    : dir === 'pages'
    ? 'ApexPage'
    : dir === 'triggers'
    ? 'ApexTrigger'
    : dir === 'aura'
    ? 'AuraDefinition'
    : dir === 'components'
    ? 'ApexComponent'
    : dir === 'lwc'
    ? 'LightningComponentResource'
    : undefined;
}

export function getAnyTTMetadataFromPath(thepath: string): IMetadataObject | undefined {
  if (thepath.indexOf(getSrcDir()) === -1 || !vscode.window.forceCode.describe) {
    return undefined;
  }
  const fileName = thepath.split(getSrcDir() + path.sep).pop();
  if (!fileName) {
    return undefined;
  }
  const baseDirectoryName = fileName.split(path.sep)[0];
  const ext = fileName.split('-meta.xml')[0].split('.').pop();
  const suffix = ext === baseDirectoryName ? undefined : ext;
  return vscode.window.forceCode.describe.metadataObjects.find(
    (o) =>
      o.directoryName === baseDirectoryName && (suffix && o.suffix ? suffix === o.suffix : true)
  );
}

export function getToolingTypeMetadata(tType: string): IMetadataObject | undefined {
  if (!vscode.window.forceCode.describe) {
    return undefined;
  }
  return vscode.window.forceCode.describe.metadataObjects.find((o) => {
    const isType = o.xmlName === tType;
    const childTypes = o.childXmlNames;
    const childType = !isType && childTypes ? childTypes.find((t) => t === tType) : undefined;
    return isType || childType !== undefined;
  });
}
