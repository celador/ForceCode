import * as vscode from 'vscode';

export function getIcon(toolingType: string) {
  switch (toolingType) {
    case 'ApexClass':
      return 'file-code';
    case 'ApexTrigger':
      return 'zap';
    case 'ApexComponent':
    case 'StandardObject':
    case 'CustomObject':
      return 'gist';
    case 'ApexLog':
      return 'bug';
    case 'ApexPage':
    default:
      return 'code';
  }
}
export function getFileExtension(document: vscode.TextDocument) {
  return document.fileName.split('.').pop();
}
export function getExtension(toolingType: string) {
  switch (toolingType) {
    case 'ApexClass':
      return 'cls';
    case 'ApexPage':
      return 'page';
    case 'ApexTrigger':
      return 'trigger';
    case 'ApexComponent':
      return 'component';
    case 'ApexLog':
      return 'log';
    case 'PermissionSet':
      return 'permissionset';
    case 'Controller':
    case 'Helper':
    case 'Renderer':
      return 'js';
    case 'Documentation':
      return 'auradoc';
    case 'Design':
      return 'design';
    case 'Svg':
      return 'svg';
    case 'Style':
      return 'css';
    case 'Component':
      return 'cmp';
    case 'Application':
      return 'app';
    case 'StaticResource':
      return 'resource';
    case 'AuraDefinitionBundle':
      return 'aura';
    case 'Event':
      return 'evt';
    case 'Interface':
      return 'intf';
    case 'Tokens':
      return 'tokens';
    case 'LightningComponentBundle':
      return 'lwc';
    case 'LightningMessageChannel':
      return 'messageChannel';
    default:
      throw toolingType + ' extension not defined';
  }
}

export function getFolder(toolingType: string) {
  switch (toolingType) {
    case 'ApexPage':
      return 'pages';
    case 'ApexTrigger':
      return 'triggers';
    case 'ApexComponent':
      return 'components';
    case 'ApexClass':
    default:
      return 'classes';
  }
}
