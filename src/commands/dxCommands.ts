import { ForcecodeCommand } from './forcecodeCommand';
import { dxService, codeCovViewService } from '../services';
import * as path from 'path';
import { FCFile } from '../services/codeCovView';
import { IWorkspaceMember } from '../forceCode';

export class OpenOrg extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.openOrg';
    this.name = 'Opening org in browser';
    this.hidden = false;
    this.description = 'Open project org';
    this.detail = 'Open the org this project is associated with in a browser.';
    this.icon = 'browser';
    this.label = 'Open Org in browser';
  }

  public command(context, selectedResource?) {
    return dxService.openOrg();
  }
}

export class PreviewVisualforce extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.previewVF';
    this.hidden = true;
  }

  public command(context, selectedResource?) {
    var vfFileNameSplit = context.fsPath.split(path.sep);
    var vfFileName = vfFileNameSplit[vfFileNameSplit.length - 1].split('.')[0];
    return dxService.openOrgPage('/apex/' + vfFileName);
  }
}

export class PreviewApp extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.previewApp';
    this.hidden = true;
  }

  public command(context, selectedResource?) {
    var appFileNameSplit = context.fsPath.split(path.sep);
    var appFileName = appFileNameSplit[appFileNameSplit.length - 1];
    return dxService.openOrgPage('/c/' + appFileName);
  }
}

export class OpenFileInOrg extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.openFileInOrg';
    this.hidden = true;
  }

  public command(context, selectedResource?) {
    var id: string | undefined;
    if (context) {
      if (context.fsPath) {
        var filePath = context.fsPath;
        const fcfile: FCFile | undefined = codeCovViewService.findByPath(filePath);
        const member: IWorkspaceMember | undefined = fcfile ? fcfile.getWsMember() : undefined;
        if (member) {
          var type = member.type;
          if (type === 'ApexClass') {
            type += 'e';
          }
          type += 's';
          id = `lightning/setup/${type}/page?address=%2F${member.id}`;
        }
      } else {
        id = context;
      }
    }
    if (id) {
      // lightning/setup/ApexTriggers/page?address=%2F + id
      return dxService.openOrgPage('/' + id);
    } else {
      return Promise.resolve();
    }
  }
}
