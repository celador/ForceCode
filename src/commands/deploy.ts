import * as vscode from 'vscode';
import {
  PXML,
  PXMLMember,
  notifications,
  getFileListFromPXML,
  zipFiles,
  getVSCodeSetting,
  getFilteredFileList,
} from '../services';
import * as path from 'path';
import klaw = require('klaw');
import { getAuraNameFromFileName, outputToString, getAnyTTMetadataFromPath } from '../parsers';
import * as xml2js from 'xml2js';
import * as fs from 'fs-extra';
import { isEmptyUndOrNull, toArray } from '../util';
import { DeployResult } from 'jsforce';
import { FCCancellationToken, ForcecodeCommand } from '.';
import { IMetadataObject } from '../forceCode';
import { VSCODE_SETTINGS } from '../services/configuration';

export class DeployPackage extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.deployPackage';
    this.cancelable = true;
    this.name = 'Deploying package';
    this.hidden = false;
    this.description = 'Deploy your package.';
    this.detail = 'Deploy from a package.xml file or choose files to deploy';
    this.icon = 'package';
    this.label = 'Deploy Package';
  }

  public command() {
    return deploy(this.cancellationToken);
  }
}

let deployOptions: any = {
  checkOnly: true,
  ignoreWarnings: false,
  rollbackOnError: true,
  singlePackage: true,
  allowMissingFiles: true,
};

function deploy(cancellationToken: FCCancellationToken) {
  let options: vscode.QuickPickItem[] = [
    {
      label: 'Deploy from package.xml',
      detail:
        'If you have a package.xml file you can deploy based off of the contents of this file',
    },
    {
      label: 'Choose files',
      detail:
        'WARNING: This will overwrite your package.xml file and deploy any destructiveChanges.xml files!!!',
    },
  ];
  let config: {} = {
    matchOnDescription: true,
    matchOnDetail: true,
    placeHolder: 'Choose files to deploy',
  };
  return vscode.window.showQuickPick(options, config).then((choice) => {
    if (!choice) {
      return Promise.resolve();
    }
    if (choice.label === 'Choose files') {
      return getFileList()
        .then(showFileList)
        .then(createPackageXML)
        .then(getFileListFromPXML)
        .then((files) => {
          return deployFiles(files, cancellationToken);
        });
    } else {
      return getFileListFromPXML().then((files) => {
        return deployFiles(files, cancellationToken);
      });
    }
  });

  function getFileList(): Promise<string[]> {
    return new Promise((resolve) => {
      let fileList: string[] = [];
      klaw(vscode.window.forceCode.projectRoot)
        .on('data', (file) => {
          if (
            file.stats.isFile() &&
            !file.path.match(/resource\-bundles.*\.resource.*$/) &&
            !(
              vscode.window.forceCode.config.spaDist !== '' &&
              file.path.indexOf(vscode.window.forceCode.config.spaDist) !== -1
            ) &&
            !file.path.endsWith('-meta.xml') &&
            path.dirname(file.path) !== vscode.window.forceCode.projectRoot
          ) {
            if (file.path.indexOf(path.join(vscode.window.forceCode.projectRoot, 'aura')) !== -1) {
              const auraName = getAuraNameFromFileName(file.path, 'aura');
              if (auraName) {
                const auraPath: string = path.join(
                  vscode.window.forceCode.projectRoot,
                  'aura',
                  auraName
                );
                if (fileList.indexOf(auraPath) === -1) {
                  fileList.push(auraPath);
                }
              }
              // this check will exclude files like package.xml
            } else if (
              file.path.indexOf(path.join(vscode.window.forceCode.projectRoot, 'lwc')) !== -1
            ) {
              const lwcName = getAuraNameFromFileName(file.path, 'lwc');
              if (lwcName) {
                const lwcPath: string = path.join(
                  vscode.window.forceCode.projectRoot,
                  'lwc',
                  lwcName
                );
                if (fileList.indexOf(lwcPath) === -1) {
                  fileList.push(lwcPath);
                }
              }
              // this check will exclude files like package.xml
            } else if (file.path.split(vscode.window.forceCode.projectRoot).length > 1) {
              fileList.push(file.path);
            }
          }
        })
        .on('end', () => {
          resolve(getFilteredFileList(fileList.sort()));
        })
        .on('error', (err: Error, item: klaw.Item) => {
          notifications.writeLog(`ForceCode: Error reading ${item.path}. Message: ${err.message}`);
        });
    });
  }

  function showFileList(files: string[]): Promise<string[]> {
    return new Promise((resolve, reject) => {
      let options: vscode.QuickPickItem[] = files
        .map((file) => {
          const fname = file.split(path.sep).pop();
          return {
            label: fname || '',
            detail: file,
          };
        })
        .filter((file) => file.label !== '');
      let config: {} = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder:
          files.length === 0 ? 'No files in the current project' : 'Choose files to deploy',
        canPickMany: true,
      };
      vscode.window.showQuickPick(options, config).then((files) => {
        if (isEmptyUndOrNull(files)) {
          reject(cancellationToken.cancel());
        }
        let theFiles: string[] = [];
        toArray(files).forEach((file) => {
          if (file) {
            theFiles.push(file.detail);
          }
        });
        resolve(theFiles);
      });
    });
  }
}

export function createPackageXML(files: string[], lwcPackageXML?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    let types: PXMLMember[] = [];
    files.forEach((file) => {
      let fileTT: IMetadataObject | undefined = getAnyTTMetadataFromPath(file);
      if (!fileTT) {
        reject();
        return;
      }
      let member: string | undefined;
      if (fileTT.xmlName === 'AuraDefinitionBundle') {
        member = getAuraNameFromFileName(file, 'aura');
      } else if (fileTT.xmlName === 'LightningComponentBundle') {
        member = getAuraNameFromFileName(file, 'lwc');
      } else if (fileTT.inFolder) {
        const file2 = file.split(vscode.window.forceCode.projectRoot + path.sep).pop();
        member = file2?.substring(file2.indexOf(path.sep) + 1);
      } else {
        member = file.split(path.sep).pop();
      }
      const lIndexOfP = member?.lastIndexOf('.') || 0;
      member = lIndexOfP > 0 ? member?.substring(0, lIndexOfP) : member;
      if (member) {
        member = member.replace('\\', '/');
        const index: number = findMDTIndex(types, fileTT.xmlName);
        const folderMeta = member.split('/')[0];
        const memberIndex: number = index !== -1 ? findMemberIndex(types, index, folderMeta) : -1;
        if (index !== -1) {
          types[index].members.push(member);
          if (fileTT.inFolder && memberIndex === -1) {
            types[index].members.push(folderMeta);
          }
        } else {
          let newMem: PXMLMember = {
            members: [member],
            name: fileTT.xmlName,
          };
          if (fileTT.inFolder) {
            newMem.members.push(folderMeta);
          }
          types.push(newMem);
        }
      }
    });
    resolve(buildPackageXMLFile(types, lwcPackageXML));
  });

  function findMDTIndex(types: PXMLMember[], type: string) {
    return types.findIndex((curType) => {
      return curType.name === type;
    });
  }

  function findMemberIndex(types: PXMLMember[], index: number, member: string) {
    return types[index].members.findIndex((curType) => {
      return curType === member;
    });
  }
}

export function buildPackageXMLFile(types: PXMLMember[], lwcPackageXML?: string) {
  let packObj: PXML = {
    Package: {
      types: types,
      version:
        vscode.window.forceCode.config.apiVersion ||
        getVSCodeSetting(VSCODE_SETTINGS.defaultApiVersion),
    },
  };
  const builder = new xml2js.Builder();
  let xml: string = builder
    .buildObject(packObj)
    .replace('<Package>', '<Package xmlns="http://soap.sforce.com/2006/04/metadata">')
    .replace(' standalone="yes"', '');
  fs.outputFileSync(
    path.join(lwcPackageXML || vscode.window.forceCode.projectRoot, 'package.xml'),
    xml
  );
}

export function deployFiles(
  files: string[],
  cancellationToken: FCCancellationToken,
  lwcPackageXML?: string
): Promise<any> {
  const deployPath: string = vscode.window.forceCode.projectRoot;
  if (isEmptyUndOrNull(files)) {
    return Promise.resolve();
  }
  let zip = zipFiles(files, deployPath, lwcPackageXML);
  Object.assign(deployOptions, vscode.window.forceCode.config.deployOptions);
  if (deployOptions.testLevel === 'Default') {
    delete deployOptions.testLevel;
  }
  notifications.showLog();
  return new Promise((resolve, reject) => {
    return checkDeployStatus(
      vscode.window.forceCode.conn.metadata.deploy(zip, deployOptions),
      resolve,
      reject
    );
  })
    .then(finished)
    .catch(finished);

  // =======================================================================================================================================
  function checkDeployStatus(
    deployResult: DeployResult,
    resolveFunction: any,
    rejectFunction: any
  ) {
    if (cancellationToken.isCanceled()) {
      // TODO: Find a way to cancel the deployment here. Currently, the deployment still occurs in the background
      return rejectFunction();
    } else {
      return deployResult.check(function (err, res) {
        if (err) {
          return rejectFunction(err);
        }
        if (res.done) {
          return deployResult.complete(function (err, res) {
            if (err) {
              return rejectFunction(err);
            } else {
              return resolveFunction(res);
            }
          });
        } else {
          setTimeout(() => {
            checkDeployStatus(deployResult, resolveFunction, rejectFunction);
          }, 2000);
        }
      });
    }
  }

  function finished(res: any) /*Promise<any>*/ {
    if (cancellationToken.isCanceled()) {
      return Promise.reject();
    }
    if (res.status && res.status !== 'Failed') {
      notifications.showStatus('ForceCode: Deployed $(thumbsup)');
    } else if (!res.status) {
      let depId: string;
      const message: string = res.message || res;
      if (res.id) {
        depId = res.id;
      } else {
        depId = (res.message || res).split(' = ').pop();
      }
      res = { status: 'Failed', message: message };
      if (!message.startsWith('Polling time out')) {
        return res; // we don't know what happened so just throw it
      }

      notifications
        .showError('ForceCode: Deployment timed out. View details status in the org?', 'Yes', 'No')
        .then((choice) => {
          if (choice === 'Yes') {
            vscode.commands.executeCommand(
              'ForceCode.openFileInOrg',
              `lightning/setup/DeployStatus/page?address=%2Fchangemgmt%2FmonitorDeploymentsDetails.apexp%3FasyncId%3D${depId}%26retURL%3D%252Fchangemgmt%252FmonitorDeployment.apexp`
            );
          }
        });
    }
    notifications.writeLog(outputToString(res).replace(/{/g, '').replace(/}/g, ''));
    return res;
  }
}
