import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';
import constants from './../models/constants';
import { commandService, codeCovViewService, switchUserViewService } from '../services';
import { getToolingTypeFromExt } from '../parsers/getToolingType';
import { IWorkspaceMember } from '../forceCode';
import { FCOauth } from '../services/switchUserView';
import { getAnyTTFromFolder } from '../parsers/open';
const mime = require('mime-types');
const fetch: any = require('node-fetch');
const ZIP: any = require('zip');
const parseString: any = require('xml2js').parseString;

export interface ToolingType {
    name: string;
    members: string[];
}

export interface ToolingTypes {
    types: ToolingType[];
}

export default function retrieve(resource?: vscode.Uri | ToolingTypes) {
    const errMessage: string = 'Either the file/metadata type doesn\'t exist in the current org or you\'re trying to retrieve outside of '
        + vscode.window.forceCode.workspaceRoot;
    let option: any;
    var newWSMembers: IWorkspaceMember[] = [];
    var toolTypes: Array<{}> = [];
    var typeNames: Array<string> = [];

    return Promise.resolve(vscode.window.forceCode)
        .then(showPackageOptions)
        .then(getPackage)
        .then(processResult)
        .then(finished)
        .catch(onError);
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================

    function getPackages() {
        var orgInfo: FCOauth = switchUserViewService.orgInfo;
        var requestUrl: string = orgInfo.instanceUrl + '/_ui/common/apex/debug/ApexCSIAPI';
        var headers: any = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': 'sid=' + orgInfo.accessToken,
        };
        var body: string = 'action=EXTENT&extent=PACKAGES';
        return fetch(requestUrl, { method: 'POST', headers, body }).then(function (response) {
            if (response.status === 200) {
                return response.text();
            } else {
                vscode.window.showErrorMessage(response.statusText);
                return JSON.stringify({ PACKAGES: { packages: [] } });
            }
        }).then(function (json: string) {
            if (json.trim().startsWith('<')) {
                return [];
            } else {
                return JSON.parse(json.replace('while(1);\n', '')).PACKAGES.packages;
            }
        }).catch(function () {
            return [];
        });
    }

    function showPackageOptions() {
        if (resource !== undefined) { return Promise.resolve(); }
        return getPackages().then(packages => {
            let options: vscode.QuickPickItem[] = packages
                .map(pkg => {
                    return {
                        label: `$(briefcase) ${pkg.Name}`,
                        detail: `Package ${pkg.Id}`,
                        description: pkg.Name,
                    };
                });
            if (Array.isArray(packages) && packages.length === 0) {
                options.push({
                    label: '$(briefcase) Retrieve by name',
                    detail: `Packaged (Enter the package name manually)`,
                    description: 'manual',
                });
            }
            options.push({
                label: '$(package) Retrieve by package.xml',
                detail: `Packaged (Retrieve metadata defined in Package.xml)`,
                description: 'packaged',
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
            return vscode.window.showQuickPick(options, config);
        }).then(function (res) {
            if(!res) {
                return Promise.reject();
            }
            if (res.description === 'manual') {
                return vscode.window.showInputBox({
                    ignoreFocusOut: true,
                    prompt: 'enter your package name',
                }).then(function (name) {
                    return {
                        description: name
                    };
                });
            }
            return res;
        });
    }

    // =======================================================================================================================================
    function getPackage(opt: vscode.QuickPickItem) {
        option = opt;
        // Proxy Console.info to capture the status output from metadata tools
        vscode.window.forceCode.conn.metadata.pollTimeout = (vscode.window.forceCode.config.pollTimeout || 600) * 1000;

        if (opt) {
            return new Promise(pack);
        } else if (resource) {
            return new Promise(function (resolve) {
                // Get the Metadata Object type
                if (resource instanceof vscode.Uri && fs.lstatSync(resource.fsPath).isDirectory()) {
                    var baseDirectoryName: string = path.parse(resource.fsPath).name;
                    var type: string = getAnyTTFromFolder(resource);
                    if(!type) {
                        throw new Error(errMessage);
                    }
                    var types: any[] = [];
                    if (type === 'AuraDefinitionBundle') {
                        if(baseDirectoryName === 'aura') {
                            baseDirectoryName = '*';
                        }
                        types = [{ name: type, members: baseDirectoryName }];
                    } else {
                        types = [{ name: type, members: '*' }];
                    }
                    retrieveComponents(resolve, {types: types});
                } else if(resource instanceof vscode.Uri){
                    var toolingType: string = getAnyTTFromFolder(resource);
                    if(!toolingType) {
                        throw new Error(errMessage);
                    }
                    const name: string = path.parse(resource.fsPath).name;
                    retrieveComponents(resolve, {types: [{name: toolingType, members: [name]}]});
                } else {
                    retrieveComponents(resolve, resource);
                }
            });
        }
        throw new Error();

        function retrieveComponents(resolve, retrieveTypes: ToolingTypes) {
            resolve(vscode.window.forceCode.conn.metadata.retrieve({
                unpackaged: retrieveTypes,
                apiVersion: vscode.window.forceCode.config.apiVersion || constants.API_VERSION,
            }).stream());
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
                getSpecificTypeMetadata('CustomObject');
            } else if (option.description === 'standardobj') {
                getSpecificTypeMetadata('StandardObject');
            } else {
                packaged();
            }

            function all() {
                var types: any[] = vscode.window.forceCode.describe.metadataObjects.map(r => {
                    return { name: r.xmlName, members: '*' };
                });
                retrieveComponents(resolve, {types: types});
            }

            function getSpecificTypeMetadata(metadataType: string) {
                var types: any[] = vscode.window.forceCode.describe.metadataObjects
                    .filter(o => o.xmlName === metadataType)
                    .map(r => {
                        return { name: r.xmlName, members: '*' };
                    });
                retrieveComponents(resolve, {types: types});
            }

            function unpackaged() {
                var xmlFilePath: string = `${vscode.window.forceCode.workspaceRoot}${path.sep}package.xml`;
                var data: any = fs.readFileSync(xmlFilePath);
                parseString(data, { explicitArray: false }, function (err, dom) {
                    if (err) { reject(err); } else {
                        delete dom.Package.$;
                        resolve(vscode.window.forceCode.conn.metadata.retrieve({
                            unpackaged: dom.Package
                        }).stream());
                    }
                });
            }

            function packaged() {
                resolve(vscode.window.forceCode.conn.metadata.retrieve({
                    packageNames: [option.description],
                    apiVersion: vscode.window.forceCode.config.apiVersion || constants.API_VERSION,
                }).stream());
            }

        }
    }

    function processResult(stream: NodeJS.ReadableStream) {
        return new Promise(function (resolve, reject) {
            var bufs: any = [];
            stream.on('data', function (d) {
                bufs.push(d);
            });
            stream.on('error', function (err) {
                reject(err || { message: 'package not found' });
            });
            stream.on('end', function () {
                var reader: any[] = ZIP.Reader(Buffer.concat(bufs));
                reader.forEach(function (entry) {
                    if (entry.isFile()) {
                        var name: string = entry.getName();
                        var data: Buffer = entry.getData();
                        if (option && option.description === 'packaged') {
                            option.description = 'unpackaged';
                        }
                        if (option && option.description) {
                            name = path.normalize(name).replace(option.description + path.sep, '');
                        }
                        name = path.normalize(name).replace('unpackaged' + path.sep, '');
                        if(name !== 'package.xml' || vscode.window.forceCode.config.overwritePackageXML) {
                            fs.outputFileSync(`${vscode.window.forceCode.workspaceRoot}${path.sep}${name}`, data);
                        }
                        var tType: string = getToolingTypeFromExt(name);
                        if(tType) {
                            // add to ws members
                            var wsMem: IWorkspaceMember = {
                                name: name.split(path.sep).pop().split('.')[0],
                                path: `${vscode.window.forceCode.workspaceRoot}${path.sep}${name}`,
                                id: '',//metadataFileProperties.id,
                                lastModifiedDate: '',//metadataFileProperties.lastModifiedDate,
                                lastModifiedByName: '',
                                lastModifiedById: '',
                                type: tType,
                            }

                            newWSMembers.push(wsMem);

                            if(!typeNames.includes(tType)) {
                                typeNames.push(tType);
                                toolTypes.push({type: tType});
                            }
                        }
                        if(name.endsWith('.resource-meta.xml')) {
                            // unzip the resource
                            parseString(data, { explicitArray: false }, function (err, dom) {
                                if (!err) {
                                    var actualResData = fs.readFileSync(`${vscode.window.forceCode.workspaceRoot}${path.sep}${name}`.split('-meta.xml')[0]);
                                    var ContentType: string = dom.StaticResource.contentType;
                                    var ctFolderName = ContentType.split('/').join('.');
                                    const resFN: string = name.slice(name.indexOf(path.sep) + 1).split('.')[0];
                                    if(ContentType.includes('zip')) {
                                        var zipReader: any[] = ZIP.Reader(new Buffer(actualResData));
                                        zipReader.forEach(function (zipEntry) {
                                            if (zipEntry.isFile()) {
                                                var zipFName: string = zipEntry.getName();
                                                var zipFData: Buffer = zipEntry.getData();
                                                var filePath: string = `${vscode.window.forceCode.workspaceRoot}${path.sep}resource-bundles${path.sep}${resFN}.resource.${ctFolderName}${path.sep}${zipFName}`;
                                                fs.outputFileSync(filePath, zipFData);
                                            }
                                        });
                                    } else {
                                        // this will work for most other things...
                                        var theData: any;
                                        if(ContentType.includes('image') || ContentType.includes('shockwave-flash')) {
                                            theData = new Buffer(actualResData.toString('base64'), 'base64');
                                        } else {
                                            theData = actualResData.toString(mime.charset(ContentType) || 'UTF-8');
                                        }
                                        var ext = mime.extension(ContentType);
                                        var filePath: string = `${vscode.window.forceCode.workspaceRoot}${path.sep}resource-bundles${path.sep}${resFN}.resource.${ctFolderName}${path.sep}${resFN}.${ext}`;
                                        fs.outputFileSync(filePath, theData);
                                    }
                                }
                            });
                        }
                    }
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
                if(toolTypes.length > 0) {
                    var theTypes: {[key: string]: Array<any>} = {};
    
                    theTypes['type0'] = toolTypes;
                    if(theTypes['type0'].length > 3) {
                        for(var i = 1; theTypes['type0'].length > 3; i++) {
                            theTypes['type' + i] = theTypes['type0'].splice(0, 3);
                        }
                    }
                    let proms = Object.keys(theTypes).map(curTypes => {
                        const shouldGetCoverage = theTypes[curTypes].find(cur => {return cur.type === 'ApexClass' || cur.type === 'ApexTrigger';});
                        if(shouldGetCoverage) {
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
                    return curSet.some(key => {
                        if(newWSMembers.length > 0) {
                            var index: number = newWSMembers.findIndex(curMem => {
                                return curMem.name === key.fullName && curMem.type === key.type;
                            });
                            if(index >= 0) {
                                newWSMembers[index].id = key.id;
                                newWSMembers[index].lastModifiedDate = key.lastModifiedDate;
                                newWSMembers[index].lastModifiedByName = key.lastModifiedByName; 
                                newWSMembers[index].lastModifiedById = key.lastModifiedById;
                                codeCovViewService.addClass(newWSMembers.splice(index, 1)[0], true);
                            }
                        } else {
                            return true;
                        }
                    });
                });
                console.log('Done updating/adding metadata');
                if(getCodeCov) {
                    return commandService.runCommand('ForceCode.getCodeCoverage', undefined, undefined).then(() => {
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
        vscode.window.forceCode.outputChannel.append(vscode.window.forceCode.dxCommands.outputToString(res).replace(/{/g, '').replace(/}/g, ''));
        return Promise.resolve(res);
    }
    function onError(err) {
        if(err) {
            vscode.window.showErrorMessage('Retrieve Errors\n' + err.message);
        }
    }
    // =======================================================================================================================================
}