import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';
import { commandService, codeCovViewService, fcConnection, FCOauth, toArray } from '../services';
import { getToolingTypeFromExt } from '../parsers/getToolingType';
import { IWorkspaceMember } from '../forceCode';
import { getAnyTTFromFolder, getAnyNameFromUri } from '../parsers/open';
import { SObjectDescribe, SObjectCategory } from '../dx';
const mime = require('mime-types');
import * as compress from 'compressing';
import { parseString } from 'xml2js';
import { outputToString } from '../parsers/output';
import { packageBuilder } from '.';
import { getMembers } from './packageBuilder';
import { XHROptions, xhr } from 'request-light';

export interface ToolingType {
  name: string;
  members: string[];
}

export interface ToolingTypes {
  types: ToolingType[];
}

export default function retrieve(resource?: vscode.Uri | ToolingTypes) {
  const errMessage: string =
    "Either the file/metadata type doesn't exist in the current org or you're trying to retrieve outside of " +
    vscode.window.forceCode.projectRoot;
  let option: any;
  var newWSMembers: IWorkspaceMember[] = [];
  var toolTypes: Array<{}> = [];
  var typeNames: Array<string> = [];

  return Promise.resolve(vscode.window.forceCode)
    .then(showPackageOptions)
    .then(getPackage)
    .then(processResult)
    .then(finished);
  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================

  function getPackages(): Promise<any> {
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
      .then(function(json: string) {
        if (json.trim().startsWith('<')) {
          return [];
        } else {
          return JSON.parse(json.replace('while(1);\n', '')).PACKAGES.packages;
        }
      })
      .catch(function() {
        return [];
      });
  }

  function showPackageOptions(): Promise<any> {
    if (resource !== undefined) {
      return Promise.resolve();
    }
    return getPackages().then(packages => {
      let options: vscode.QuickPickItem[] = packages.map(pkg => {
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
          return Promise.reject();
        }
        return res;
      });
    });
  }

  // =======================================================================================================================================
  function getPackage(opt: vscode.QuickPickItem) {
    option = opt;

    vscode.window.forceCode.conn.metadata.pollTimeout = (vscode.window.forceCode.config.pollTimeout || 600) * 1000;
    if (opt) {
      return new Promise(pack);
    } else if (resource) {
      return new Promise(function(resolve, reject) {
        // Get the Metadata Object type
        if (resource instanceof vscode.Uri) {
          var toolingType: string = getAnyTTFromFolder(resource);
          if (!toolingType) {
            throw new Error(errMessage);
          }
          getAnyNameFromUri(resource).then(names => {
            retrieveComponents(resolve, reject, { types: [names] });
          });
        } else {
          retrieveComponents(resolve, reject, resource);
        }
      });
    }
    throw new Error();

    function retrieveComponents(resolve, reject, retrieveTypes: ToolingTypes) {
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
      var theStream = vscode.window.forceCode.conn.metadata.retrieve({
        unpackaged: retrieveTypes,
        apiVersion:
          vscode.window.forceCode.config.apiVersion ||
          vscode.workspace.getConfiguration('force')['defaultApiVersion'],
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

    function pack(resolve, reject) {
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
        reject();
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
        new SObjectDescribe().describeGlobal(type).then(objs => {
          retrieveComponents(resolve, reject, { types: [{ name: 'CustomObject', members: objs }] });
        });
      }
    }
  }

  function processResult(stream: fs.ReadStream) {
    return new Promise(function(resolve, reject) {
      var resBundleNames: string[] = [];
      const destDir: string = vscode.window.forceCode.projectRoot;
      new compress.zip.UncompressStream({ source: stream })
        .on('error', function(err) {
          reject(err || { message: 'package not found' });
        })
        .on('entry', function(header, stream, next) {
          stream.on('end', next);
          const name = path.normalize(header.name).replace('unpackaged' + path.sep, '');
          if (header.type === 'file') {
            const tType: string = getToolingTypeFromExt(name);
            if (tType) {
              // add to ws members
              var wsMem: IWorkspaceMember = {
                name: name
                  .split(path.sep)
                  .pop()
                  .split('.')[0],
                path: `${vscode.window.forceCode.projectRoot}${path.sep}${name}`,
                id: '', //metadataFileProperties.id,
                type: tType,
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
                    theData = new Buffer(actualResData.toString('base64'), 'base64');
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
  function finished(res): Promise<any> {
    if (res.success) {
      var getCodeCov: boolean = false;
      console.log('Done retrieving files');
      // check the metadata and add the new members
      return updateWSMems().then(() => {
        if (option) {
          vscode.window.forceCode.showStatus(`Retrieve ${option.description} $(thumbsup)`);
        } else {
          vscode.window.forceCode.showStatus(`Retrieve $(thumbsup)`);
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
              getCodeCov = true;
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

      function parseRecords(recs: any[]): Promise<any> {
        console.log('Done retrieving metadata records');
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
            } else {
              return true;
            }
          });
        });
        console.log('Done updating/adding metadata');
        if (getCodeCov) {
          return commandService
            .runCommand('ForceCode.getCodeCoverage', undefined, undefined)
            .then(() => {
              console.log('Done retrieving code coverage');
              return Promise.resolve();
            });
        } else {
          return Promise.resolve();
        }
      }
    } else {
      vscode.window.showErrorMessage('Retrieve Errors');
    }
    vscode.window.forceCode.outputChannel.append(
      outputToString(res)
        .replace(/{/g, '')
        .replace(/}/g, '')
    );
    return Promise.resolve(res);
  }
  // =======================================================================================================================================
}
