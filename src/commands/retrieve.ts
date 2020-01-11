import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';
import {
  codeCovViewService,
  fcConnection,
  FCOauth,
  dxService,
  SObjectCategory,
  PXMLMember,
  notifications,
  getVSCodeSetting,
  commandViewService,
} from '../services';
import { getToolingTypeFromExt, getAnyTTMetadataFromPath, outputToString } from '../parsers';
import { IWorkspaceMember, IMetadataObject, ICodeCoverage } from '../forceCode';
const mime = require('mime-types');
import * as compress from 'compressing';
import { parseString } from 'xml2js';
import {
  packageBuilder,
  FCCancellationToken,
  ForcecodeCommand,
  getMembers,
  getFolderContents,
  getAuraDefTypeFromDocument,
} from '.';
import { XHROptions, xhr } from 'request-light';
import { toArray } from '../util';

export class Refresh extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.refresh';
    this.cancelable = true;
    this.name = 'Retrieving ';
    this.hidden = true;
  }

  public command(context: any, selectedResource?: any) {
    if (selectedResource instanceof Array) {
      return new Promise((resolve, reject) => {
        var files: PXMLMember[] = [];
        var proms: Promise<PXMLMember>[] = selectedResource.map(curRes => {
          if (curRes.fsPath.startsWith(vscode.window.forceCode.projectRoot + path.sep)) {
            return getAnyNameFromUri(curRes);
          } else {
            throw {
              message:
                "Only files/folders within the current org's src folder (" +
                vscode.window.forceCode.projectRoot +
                ') can be retrieved/refreshed.',
            };
          }
        });
        Promise.all(proms)
          .then(theNames => {
            theNames.forEach(curName => {
              var index: number = getTTIndex(curName.name, files);
              if (index >= 0) {
                // file deepcode ignore ComparisonArrayLiteral: <please specify a reason of ignoring this>
                if (curName.members === ['*']) {
                  files[index].members = ['*'];
                } else {
                  files[index].members.push(...curName.members);
                }
              } else {
                files.push(curName);
              }
            });
            resolve(retrieve({ types: files }, this.cancellationToken));
          })
          .catch(reject);
      });
    }
    if (context) {
      return retrieve(context, this.cancellationToken);
    }
    if (!vscode.window.activeTextEditor) {
      return undefined;
    }
    return retrieve(vscode.window.activeTextEditor.document.uri, this.cancellationToken);

    function getTTIndex(toolType: string, arr: ToolingType[]): number {
      return arr.findIndex(cur => {
        return cur.name === toolType && cur.members !== ['*'];
      });
    }
  }
}

export class RetrieveBundle extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.retrievePackage';
    this.cancelable = true;
    this.name = 'Retrieving package';
    this.hidden = false;
    this.description = 'Retrieve metadata to your src directory.';
    this.detail =
      'You can choose to retrieve by your package.xml, retrieve all metadata, or choose which types to retrieve.';
    this.icon = 'cloud-download';
    this.label = 'Retrieve Package/Metadata';
  }

  public command(context: vscode.Uri | ToolingTypes | undefined) {
    return retrieve(context, this.cancellationToken);
  }
}

export interface ToolingType {
  name: string;
  members: string[];
}

interface ToolingTypes {
  types: ToolingType[];
}

export function retrieve(
  resource: vscode.Uri | ToolingTypes | undefined,
  cancellationToken: FCCancellationToken
) {
  let option: any;
  var newWSMembers: IWorkspaceMember[] = [];
  var toolTypes: Array<{}> = [];
  var typeNames: Array<string> = [];
  var packageName: string | undefined;

  return Promise.resolve(vscode.window.forceCode)
    .then(showPackageOptions)
    .then(getPackage)
    .then(processResult)
    .then(finished);
  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================

  function getPackages(): Promise<any> {
    if (!fcConnection.currentConnection) {
      return Promise.reject('No current connection');
    }
    var orgInfo: FCOauth = fcConnection.currentConnection.orgInfo;
    var requestUrl: string = orgInfo.instanceUrl + '/_ui/common/apex/debug/ApexCSIAPI';
    const foptions: XHROptions = {
      type: 'POST',
      url: requestUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Cookie: 'sid=' + orgInfo.accessToken,
      },
      data: 'action=EXTENT&extent=PACKAGES',
    };

    return xhr(foptions)
      .then(response => {
        if (response.status === 200) {
          return response.responseText;
        } else {
          return JSON.stringify({ PACKAGES: { packages: [] } });
        }
      })
      .then((json: string) => {
        if (json.trim().startsWith('<')) {
          return [];
        } else {
          return JSON.parse(json.replace('while(1);\n', '')).PACKAGES.packages;
        }
      })
      .catch(() => {
        return [];
      });
  }

  function showPackageOptions(): Promise<any> {
    if (resource !== undefined) {
      return Promise.resolve();
    }
    return getPackages().then(packages => {
      let options: vscode.QuickPickItem[] = packages.map((pkg: any) => {
        return {
          label: `$(briefcase) ${pkg.Name}`,
          detail: `Package ${pkg.Id}`,
          description: pkg.Name,
        };
      });
      options.push({
        label: '$(package) Retrieve by package.xml',
        detail: `Packaged (Retrieve metadata defined in Package.xml)`,
        description: 'packaged',
      });
      options.push({
        label: '$(check) Choose types...',
        detail: `Choose which metadata types to retrieve`,
        description: 'user-choice',
      });
      options.push({
        label: '$(cloud-download) Get All Files from org',
        detail: `All Unpackaged`,
        description: 'unpackaged',
      });
      options.push({
        label: '$(cloud-download) Get All Apex Classes from org',
        detail: `All Apex Classes`,
        description: 'apexclasses',
      });
      options.push({
        label: '$(cloud-download) Get All Apex Pages from org',
        detail: `All Apex Pages`,
        description: 'apexpages',
      });
      options.push({
        label: '$(cloud-download) Get All Aura Components from org',
        detail: `All Aura Bundles`,
        description: 'aurabundles',
      });
      options.push({
        label: '$(cloud-download) Get All Standard Objects from org',
        detail: `All Standard Objects`,
        description: 'standardobj',
      });
      options.push({
        label: '$(cloud-download) Get All Custom Objects from org',
        detail: `All Custom Objects`,
        description: 'customobj',
      });
      let config: {} = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Retrieve Package',
      };
      return vscode.window.showQuickPick(options, config).then(res => {
        if (!res) {
          return Promise.reject(cancellationToken.cancel());
        }
        return res;
      });
    });
  }

  // =======================================================================================================================================
  function getPackage(opt: vscode.QuickPickItem): Promise<any> {
    option = opt;

    vscode.window.forceCode.conn.metadata.pollTimeout =
      (vscode.window.forceCode.config.pollTimeout || 600) * 1000;
    if (opt) {
      return new Promise(pack);
    } else if (resource) {
      return new Promise(function(resolve, reject) {
        // Get the Metadata Object type
        if (resource instanceof vscode.Uri) {
          getAnyNameFromUri(resource)
            .then(names => {
              retrieveComponents(resolve, reject, { types: [names] });
            })
            .catch(reject);
        } else {
          retrieveComponents(resolve, reject, resource);
        }
      });
    }
    throw new Error();

    function retrieveComponents(resolve: any, reject: any, retrieveTypes: ToolingTypes) {
      // count the number of types. if it's more than 10,000 the retrieve will fail
      var totalTypes: number = 0;
      retrieveTypes.types.forEach(type => {
        totalTypes += type.members.length;
      });
      if (totalTypes > 10000) {
        reject({
          message:
            'Cannot retrieve more than 10,000 files at a time. Please select "Choose Types..." from the retrieve menu and try to download without Reports selected first.',
        });
      }
      if (cancellationToken.isCanceled()) {
        reject();
      }
      var theStream = vscode.window.forceCode.conn.metadata.retrieve({
        unpackaged: retrieveTypes,
        apiVersion:
          vscode.window.forceCode.config.apiVersion || getVSCodeSetting('defaultApiVersion'),
      });
      theStream.on('error', error => {
        reject(
          error || {
            message:
              'Cannot retrieve more than 10,000 files at a time. Please select "Choose Types..." from the retrieve menu and try to download without Reports selected first.',
          }
        );
      });
      resolve(theStream.stream());
    }

    function pack(resolve: any, reject: any) {
      if (option.description === 'unpackaged') {
        all();
      } else if (option.description === 'packaged') {
        unpackaged();
      } else if (option.description === 'apexclasses') {
        getSpecificTypeMetadata('ApexClass');
      } else if (option.description === 'apexpages') {
        getSpecificTypeMetadata('ApexPage');
      } else if (option.description === 'aurabundles') {
        getSpecificTypeMetadata('AuraDefinitionBundle');
      } else if (option.description === 'customobj') {
        getObjects(SObjectCategory.CUSTOM);
      } else if (option.description === 'standardobj') {
        getObjects(SObjectCategory.STANDARD);
      } else if (option.description === 'user-choice') {
        builder();
      } else {
        packageName = option.description;
        if (packageName) {
          packaged();
        } else {
          reject();
        }
      }

      function packaged() {
        // option.description is the package name
        if (cancellationToken.isCanceled()) {
          reject();
        }
        var theStream = vscode.window.forceCode.conn.metadata.retrieve({
          packageNames: [option.description],
          apiVersion:
            vscode.window.forceCode.config.apiVersion || getVSCodeSetting('defaultApiVersion'),
        });
        theStream.on('error', error => {
          reject(
            error || {
              message: 'There was an error retrieving ' + option.description,
            }
          );
        });
        resolve(theStream.stream()).catch(reject);
      }

      function builder() {
        packageBuilder()
          .then(mappedTypes => {
            retrieveComponents(resolve, reject, { types: mappedTypes });
          })
          .catch(reject);
      }

      function all() {
        getMembers(['*'], true)
          .then(mappedTypes => {
            retrieveComponents(resolve, reject, { types: mappedTypes });
          })
          .catch(reject);
      }

      function getSpecificTypeMetadata(metadataType: string) {
        if (!vscode.window.forceCode.describe) {
          return reject(
            'Metadata describe error. Please try logging out of and back into the org.'
          );
        }
        var types: any[] = vscode.window.forceCode.describe.metadataObjects
          .filter(o => o.xmlName === metadataType)
          .map(r => {
            return { name: r.xmlName, members: '*' };
          });
        retrieveComponents(resolve, reject, { types: types });
      }

      function unpackaged() {
        var xmlFilePath: string = `${vscode.window.forceCode.projectRoot}${path.sep}package.xml`;
        var data: any = fs.readFileSync(xmlFilePath);
        parseString(data, { explicitArray: false }, function(err, dom) {
          if (err) {
            reject(err);
          } else {
            delete dom.Package.$;
            if (!dom.Package.types) {
              reject({ message: 'No types element found to retrieve in the package.xml file.' });
            }
            if (!dom.Package.version) {
              reject({ message: 'No version element found in package.xml file.' });
            }
            const typeWithoutMembersOrName = toArray(dom.Package.types).find(curType => {
              return !curType.members || !curType.name;
            });
            if (typeWithoutMembersOrName) {
              if (typeWithoutMembersOrName.name) {
                reject({
                  message:
                    typeWithoutMembersOrName.name +
                    ' element has no members element defined to retrieve in package.xml file.',
                });
              } else {
                reject({
                  message: 'package.xml file contains a type element without a name element',
                });
              }
            }
            if (cancellationToken.isCanceled()) {
              reject();
            }
            try {
              resolve(
                vscode.window.forceCode.conn.metadata
                  .retrieve({
                    unpackaged: dom.Package,
                  })
                  .stream()
              );
            } catch (e) {
              reject(e);
            }
          }
        });
      }

      function getObjects(type: SObjectCategory) {
        dxService.describeGlobal(type).then(objs => {
          retrieveComponents(resolve, reject, { types: [{ name: 'CustomObject', members: objs }] });
        });
      }
    }
  }

  function processResult(stream: fs.ReadStream): Promise<any> {
    return new Promise(function(resolve, reject) {
      cancellationToken.cancellationEmitter.on('cancelled', function() {
        stream.pause();
        reject(stream.emit('end'));
      });
      var resBundleNames: string[] = [];
      const destDir: string = vscode.window.forceCode.projectRoot;
      new compress.zip.UncompressStream({ source: stream })
        .on('error', function(err: any) {
          reject(err || { message: 'package not found' });
        })
        .on('entry', function(header: any, stream: any, next: any) {
          stream.on('end', next);
          var name = path.normalize(header.name).replace('unpackaged' + path.sep, '');
          name = packageName ? name.replace(packageName + path.sep, '') : name;
          if (header.type === 'file') {
            const tType: string | undefined = getToolingTypeFromExt(name);
            const fullName = name.split(path.sep).pop();
            if (tType && fullName) {
              // add to ws members

              var wsMem: IWorkspaceMember = {
                name: fullName.split('.')[0],
                path: `${vscode.window.forceCode.projectRoot}${path.sep}${name}`,
                id: '', //metadataFileProperties.id,
                type: tType,
                coverage: new Map<string, ICodeCoverage>(),
              };

              newWSMembers.push(wsMem);

              if (!typeNames.includes(tType)) {
                typeNames.push(tType);
                toolTypes.push({ type: tType });
              }
            }
            if (name.endsWith('.resource-meta.xml')) {
              resBundleNames.push(name);
            }
            if (name !== 'package.xml' || vscode.window.forceCode.config.overwritePackageXML) {
              if (!fs.existsSync(path.dirname(path.join(destDir, name)))) {
                fs.mkdirpSync(path.dirname(path.join(destDir, name)));
              }
              stream.pipe(fs.createWriteStream(path.join(destDir, name)));
            } else {
              next();
            }
          } else {
            // directory
            fs.mkdirpSync(path.join(destDir, header.name));
            stream.resume();
          }
        })
        .on('finish', () => {
          resBundleNames.forEach(metaName => {
            const data: string = fs.readFileSync(path.join(destDir, metaName)).toString();
            // unzip the resource
            parseString(data, { explicitArray: false }, function(err, dom) {
              if (!err) {
                var actualResData = fs.readFileSync(
                  path.join(destDir, metaName).split('-meta.xml')[0]
                );
                var ContentType: string = dom.StaticResource.contentType;
                var ctFolderName = ContentType.split('/').join('.');
                const resFN: string = metaName.slice(metaName.indexOf(path.sep) + 1).split('.')[0];
                var zipFilePath: string = path.join(
                  destDir,
                  'resource-bundles',
                  resFN + '.resource.' + ctFolderName
                );
                if (ContentType.includes('gzip')) {
                  compress.gzip.uncompress(actualResData, zipFilePath);
                } else if (ContentType.includes('zip')) {
                  compress.zip.uncompress(actualResData, zipFilePath);
                } else {
                  // this will work for most other things...
                  var theData: any;
                  if (ContentType.includes('image') || ContentType.includes('shockwave-flash')) {
                    theData = Buffer.from(actualResData.toString('base64'), 'base64');
                  } else {
                    theData = actualResData.toString(mime.charset(ContentType) || 'UTF-8');
                  }
                  var ext = mime.extension(ContentType);
                  var filePath: string = path.join(
                    destDir,
                    'resource-bundles',
                    resFN + '.resource.' + ctFolderName,
                    resFN + '.' + ext
                  );
                  fs.outputFileSync(filePath, theData);
                }
              }
            });
          });
          resolve({ success: true });
        });
    });
  }
  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================
  function finished(res: any): Promise<any> {
    if (res.success) {
      notifications.writeLog('Done retrieving files');
      // check the metadata and add the new members
      return updateWSMems().then(() => {
        if (option) {
          notifications.showStatus(`Retrieve ${option.description} $(thumbsup)`);
        } else {
          notifications.showStatus(`Retrieve $(thumbsup)`);
        }
        return Promise.resolve(res);
      });

      function updateWSMems(): Promise<any> {
        if (toolTypes.length > 0) {
          var theTypes: { [key: string]: Array<any> } = {};

          theTypes['type0'] = toolTypes;
          if (theTypes['type0'].length > 3) {
            for (var i = 1; theTypes['type0'].length > 3; i++) {
              theTypes['type' + i] = theTypes['type0'].splice(0, 3);
            }
          }
          let proms = Object.keys(theTypes).map(curTypes => {
            const shouldGetCoverage = theTypes[curTypes].find(cur => {
              return cur.type === 'ApexClass' || cur.type === 'ApexTrigger';
            });
            if (shouldGetCoverage) {
              commandViewService.enqueueCodeCoverage();
            }
            return vscode.window.forceCode.conn.metadata.list(theTypes[curTypes]);
          });
          return Promise.all(proms).then(rets => {
            return parseRecords(rets);
          });
        } else {
          return Promise.resolve();
        }
      }

      function parseRecords(recs: any[]): Thenable<any> {
        notifications.writeLog('Done retrieving metadata records');
        recs.some(curSet => {
          return toArray(curSet).some(key => {
            if (key && newWSMembers.length > 0) {
              var index: number = newWSMembers.findIndex(curMem => {
                return curMem.name === key.fullName && curMem.type === key.type;
              });
              if (index >= 0) {
                newWSMembers[index].id = key.id;
                codeCovViewService.addClass(newWSMembers.splice(index, 1)[0]);
              }
              return false;
            } else {
              return true;
            }
          });
        });
        notifications.writeLog('Done updating/adding metadata');
        return Promise.resolve();
      }
    } else {
      notifications.showError('Retrieve Errors');
    }
    notifications.writeLog(
      outputToString(res)
        .replace(/{/g, '')
        .replace(/}/g, '')
    );
    return Promise.resolve(res);
  }
  // =======================================================================================================================================
}

export function getAnyNameFromUri(uri: vscode.Uri, getDefType?: boolean): Promise<PXMLMember> {
  return new Promise(async (resolve, reject) => {
    const projRoot: string = vscode.window.forceCode.projectRoot + path.sep;
    if (uri.fsPath.indexOf(projRoot) === -1) {
      return reject(
        'The file you are attempting to save/retrieve/delete (' +
          uri.fsPath +
          ') is outside of ' +
          vscode.window.forceCode.projectRoot
      );
    }
    const ffNameParts: string[] = uri.fsPath.split(projRoot)[1].split(path.sep);
    var baseDirectoryName: string = path.parse(uri.fsPath).name;
    const isAura: boolean = ffNameParts[0] === 'aura';
    const isLWC: boolean = ffNameParts[0] === 'lwc';
    const isDir: boolean = fs.lstatSync(uri.fsPath).isDirectory();
    const tType: IMetadataObject | undefined = getAnyTTMetadataFromPath(uri.fsPath);
    const isResource: boolean = ffNameParts[0] === 'resource-bundles';
    if (isResource) {
      if (ffNameParts.length === 1) {
        // refresh all bundles
        return resolve({ name: 'StaticResource', members: ['*'] });
      } else {
        // refresh specific bundle
        const members: string = ffNameParts[1].split('.resource').shift() || '*';
        return resolve({ name: 'StaticResource', members: [members] });
      }
    }
    if (!tType) {
      return reject(
        "Either the file/metadata type doesn't exist in the current org or you're trying to save/retrieve/delete outside of " +
          vscode.window.forceCode.projectRoot
      );
    }
    var folderedName: string;
    if (tType.inFolder && ffNameParts.length > 2) {
      // we have foldered metadata
      ffNameParts.shift();
      folderedName = ffNameParts.join('/').split('.')[0];
      return resolve({ name: tType.xmlName, members: [folderedName] });
    } else if (isDir) {
      if (isAura || isLWC) {
        if (baseDirectoryName === 'aura' || baseDirectoryName === 'lwc') {
          baseDirectoryName = '*';
        }
        return resolve({ name: tType.xmlName, members: [baseDirectoryName] });
      } else if (tType.inFolder && ffNameParts.length > 1) {
        return getFolderContents(tType.xmlName, ffNameParts[1]).then(contents => {
          return resolve({ name: tType.xmlName, members: contents });
        });
      } else {
        return getMembers([tType.xmlName], true).then(members => {
          return resolve(members[0]);
        });
      }
    } else {
      var defType: string | undefined;
      const retObj: PXMLMember = { name: tType.xmlName, members: [] };
      if (isAura && getDefType) {
        defType = getAuraDefTypeFromDocument(await vscode.workspace.openTextDocument(uri.fsPath));
        if (
          defType === 'COMPONENT' ||
          defType === 'APPLICATION' ||
          defType === 'EVENT' ||
          defType === 'INTERFACE' ||
          defType === 'Metadata'
        ) {
          // used for deleting. we can't delete just the component or the metadata
          defType = undefined;
        }
        if (defType === 'CONTROLLER' || defType === 'HELPER' || defType === 'RENDERER') {
          baseDirectoryName = baseDirectoryName.substring(
            0,
            baseDirectoryName.toUpperCase().lastIndexOf(defType)
          );
        }
        retObj.defType = defType;
      }
      baseDirectoryName = baseDirectoryName.split('.')[0];
      retObj.members = [baseDirectoryName];
      return resolve(retObj);
    }
  });
}
