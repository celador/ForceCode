import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';
import * as error from './../util/error';
const fetch: any = require('node-fetch');
const ZIP: any = require('zip');
const parseString: any = require('xml2js').parseString;
var tools: any = require('jsforce-metadata-tools');
var elegantSpinner: any = require('elegant-spinner');

export default function retrieve(context: vscode.ExtensionContext, resource?: vscode.Uri) {
    vscode.window.forceCode.statusBarItem.text = 'Retrieve Started';
    let option: any;
    const _consoleInfoReference: any = console.info;
    const _consoleErrorReference: any = console.error;
    const _consoleLogReference: any = console.log;
    const spinner: any = elegantSpinner();
    var interval: any = undefined;
    const statsPath: string = `${vscode.workspace.rootPath}${path.sep}RetrieveStatistics.log`;
    var logger: any = (function (fs) {
        var buffer: string = '';
        return {
            log: log,
            flush: flush,
        };
        function log(val) {
            buffer += (val + '\n');
            vscode.window.forceCode.outputChannel.appendLine(val);
        }
        function flush() {
            var logFile: any = path.resolve(statsPath);
            fs.writeFileSync(logFile, buffer, 'utf8');
            buffer = '';
        }
    }(fs));
    return vscode.window.forceCode.connect(context)
        .then(svc => showPackageOptions(svc.conn))
        .then(getPackage)
        .then(processResult)
        .then(finished)
        .catch(onError);
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================

    function getPackages(conn) {
        var requestUrl: string = conn.instanceUrl + '/_ui/common/apex/debug/ApexCSIAPI';
        var headers: any = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': 'sid=' + conn.accessToken,
        };
        var body: string = 'action=EXTENT&extent=PACKAGES';
        return fetch(requestUrl, { method: 'POST', headers, body }).then(function (response) {
            if (response.status === 200) {
                return response.text();
            } else {
                vscode.window.forceCode.statusBarItem.text = response.statusText;
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

    function showPackageOptions(conn) {
        if (resource !== undefined) { return undefined; }
        return getPackages(conn).then(packages => {
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
            let config: {} = {
                matchOnDescription: true,
                matchOnDetail: true,
                placeHolder: 'Retrieve Package',
            };
            return vscode.window.showQuickPick(options, config);
        }).then(function (res) {
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
        registerProxy();
        vscode.window.forceCode.conn.metadata.pollTimeout = (vscode.window.forceCode.config.pollTimeout || 600) * 1000;

        if (opt) {
            clearInterval(interval);
            interval = setInterval(function () {
                vscode.window.forceCode.statusBarItem.text = `Retrieve ${option.description} ` + spinner();
            }, 50);
            return new Promise(pack);
        } else if (resource) {
            return new Promise(function (resolve, reject) {
                vscode.window.forceCode.conn.metadata.describe().then(describe => {
                    // Get the Metadata Object type
                    let extension: string = resource.fsPath.slice(resource.fsPath.lastIndexOf('.')).replace('.', '');
                    var metadataTypes: any[] = describe.metadataObjects
                        .filter(o => o.suffix === extension);

                    var listTypes: any[] = metadataTypes
                        .map(o => {
                            return {
                                type: o.xmlName,
                                folder: o.directoryName,
                            };
                        });

                    var retrieveTypes: any[] = metadataTypes
                        .map(o => {
                            return {
                                name: o.xmlName,
                                members: '*',
                            };
                        });
                    // List the Metadata by that type
                    return vscode.window.forceCode.conn.metadata.list(listTypes).then(res => {
                        let fileName: string = resource.fsPath.slice(resource.fsPath.lastIndexOf(path.sep) + 1);
                        var files: string[] = [];
                        // Match the metadata against the filepath
                        if (Array.isArray(res)) {
                            files = res.filter(t => {
                                let r: string = '\\' + path.sep + '(' + vscode.window.forceCode.config.prefix + ')*' + '(\\\_\\\_)*' + fileName;
                                return t.fileName.match(new RegExp(r, 'i'));
                            }).map(t => {
                                return t.fileName;
                            });
                        } else if (typeof res === 'object') {
                            files.push(res['fileName']);
                        }
                        // Retrieve the file by it's name
                        vscode.window.forceCode.conn.metadata.retrieve({
                            singlePackage: true,
                            specificFiles: files,
                            unpackaged: { types: retrieveTypes },
                            apiVersion: vscode.window.forceCode.config.apiVersion || vscode.window.forceCode.conn.version,
                        }, resolve);
                    });

                });
            });
        }


        function pack(resolve, reject) {
            if (option.description === 'unpackaged') {
                all();
            } else if (option.description === 'packaged') {
                unpackaged();
            } else {
                packaged();
            }

            function all() {
                vscode.window.forceCode.conn.metadata.describe().then(res => {
                    var types: any[] = res.metadataObjects.map(r => {
                        return { name: r.xmlName, members: '*' };
                    });
                    vscode.window.forceCode.conn.metadata.retrieve({
                        unpackaged: { types: types },
                        apiVersion: vscode.window.forceCode.config.apiVersion || vscode.window.forceCode.conn.version,
                    }, resolve);
                });
            }

            function unpackaged() {
                var xmlFilePath: string = `${vscode.window.forceCode.workspaceRoot}${path.sep}package.xml`;
                var data: any = fs.readFileSync(xmlFilePath);
                parseString(data, { explicitArray: false }, function (err, dom) {
                    if (err) { reject(err); } else {
                        delete dom.Package.$;
                        vscode.window.forceCode.conn.metadata.retrieve({
                            unpackaged: dom.Package
                        }, resolve);
                    }
                });
            }

            function packaged() {
                vscode.window.forceCode.conn.metadata.retrieve({
                    packageNames: [option.description],
                    apiVersion: vscode.window.forceCode.config.apiVersion || vscode.window.forceCode.conn.version,
                }, resolve);
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
                reject(err || {message: 'package not found'});
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
                        fs.outputFileSync(`${vscode.window.forceCode.workspaceRoot}${path.sep}${name}`, data);
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
        clearInterval(interval);
        if (res.success) {
            setTimeout(function() {
                vscode.window.forceCode.statusBarItem.text = `Retrieve ${option.description} $(thumbsup)`;
            }, 100);
        } else {
            setTimeout(function() {
                vscode.window.forceCode.statusBarItem.text = 'Retrieve Errors $(thumbsdown)';
            }, 100);
        }
        tools.reportRetrieveResult(res, logger, vscode.window.forceCode.config.deployOptions.verbose);
        logger.flush();
        unregisterProxy();
        return res;
    }
    function onError(err) {
        clearInterval(interval);
        unregisterProxy();
        setTimeout(function() {
            vscode.window.forceCode.statusBarItem.text = 'Retrieve Errors $(thumbsdown)';
        }, 100);
        return error.outputError(err, vscode.window.forceCode.outputChannel);
    }
    // =======================================================================================================================================
    function registerProxy() {
        console.info = function () {
            var msg: string = arguments[0];
            vscode.window.forceCode.outputChannel.appendLine(msg);
            return _consoleInfoReference.apply(this, arguments);
        };
        console.log = function () {
            return _consoleLogReference.apply(this, arguments);
        };
        console.error = function () {
            if (!arguments[0].match(/DeprecationWarning\:/)) {
                vscode.window.forceCode.outputChannel.appendLine(arguments[0]);
            }
            return _consoleErrorReference.apply(this, arguments);
        };
    }
    function unregisterProxy() {
        console.info = _consoleInfoReference;
        console.log = _consoleLogReference;
        console.error = _consoleErrorReference;
    }
}
