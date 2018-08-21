import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';
import * as parsers from './../parsers';
import constants from './../models/constants';
import { getFileStream } from './retrieveAny';
const fetch: any = require('node-fetch');
const ZIP: any = require('zip');
const parseString: any = require('xml2js').parseString;

export default function retrieve(resource?: any) {
    let option: any;

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
        var requestUrl: string = vscode.window.forceCode.dxCommands.orgInfo.instanceUrl + '/_ui/common/apex/debug/ApexCSIAPI';
        var headers: any = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': 'sid=' + vscode.window.forceCode.dxCommands.orgInfo.accessToken,
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
        } else if (resource && resource.fsPath) {
            return new Promise(function (resolve) {
                // Get the Metadata Object type
                var describe = vscode.window.forceCode.describe;
                var isDirectory: Boolean = fs.lstatSync(resource.fsPath).isDirectory();
                if (isDirectory) {
                    var baseDirectoryName: string = path.parse(resource.fsPath).name;
                    var types: any[] = describe.metadataObjects
                        .filter(o => o.directoryName === baseDirectoryName)
                        .map(r => {
                            return { name: r.xmlName, members: '*' };
                        });

                    if (types.length <= 0) {
                        types = getAuraBundle(describe);
                    }

                    if (types.length > 0) {
                        retrieveComponents(resolve, types);
                    }
                } else {
                    vscode.workspace.openTextDocument(resource).then(doc => {
                        var toolingType = parsers.getToolingType(doc);
                        const name: string = parsers.getName(doc, toolingType);
                        resolve(getFileStream(name, toolingType));
                    });
                }
            });
        } else if(resource && resource.name) {
            return getFileStream(resource.name, resource.toolingType);
        }
        return Promise.resolve({});

        function getAuraBundle(describe): any[] {
            // if nothing was found, then check if this is an AURA componet...
            var baseDirectoryName: string = parsers.getAuraNameFromFileName(resource.fsPath);
            var types: any[] = describe.metadataObjects
                .filter(o => o.xmlName === 'AuraDefinitionBundle')
                .map(r => {
                    return { name: r.xmlName, members: baseDirectoryName };
                });
            return types;
        }

        function retrieveComponents(resolve, types) {
            resolve(vscode.window.forceCode.conn.metadata.retrieve({
                unpackaged: { types: types },
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
                resolve(vscode.window.forceCode.conn.metadata.retrieve({
                    unpackaged: { types: types },
                    apiVersion: vscode.window.forceCode.config.apiVersion || constants.API_VERSION,
                }).stream());
            }

            function getSpecificTypeMetadata(metadataType: string) {
                var types: any[] = vscode.window.forceCode.describe.metadataObjects
                    .filter(o => o.xmlName === metadataType)
                    .map(r => {
                        return { name: r.xmlName, members: '*' };
                    });

                resolve(vscode.window.forceCode.conn.metadata.retrieve({
                    unpackaged: { types: types },
                    apiVersion: vscode.window.forceCode.config.apiVersion || constants.API_VERSION,
                }).stream());
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
                        if ((name != 'package.xml' && name.search('meta.xml') < 0)
								|| vscode.window.forceCode.config.handleMetaFiles) {
                            fs.outputFileSync(`${vscode.window.forceCode.workspaceRoot}${path.sep}${name}`, data);
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
    function finished(res): boolean {
        if (res.success) {
            setTimeout(function () {
                if (option) {
                    vscode.window.forceCode.showStatus(`Retrieve ${option.description} $(thumbsup)`);
                } else {
                    vscode.window.forceCode.showStatus(`Retrieve $(thumbsup)`);
                }
            }, 100);
        } else {
            setTimeout(function () {
                vscode.window.showErrorMessage('Retrieve Errors');
            }, 100);
        }
        vscode.window.forceCode.outputChannel.append(vscode.window.forceCode.dxCommands.outputToString(res).replace(/{/g, '').replace(/}/g, ''));
        return res;
    }
    function onError(err) {
        if(err) {
            vscode.window.showErrorMessage('Retrieve Errors\n' + err.message);
        }
    }
    // =======================================================================================================================================
}