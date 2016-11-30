import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as error from './../util/error';
const fetch: any = require('node-fetch');
const ZIP: any = require('zip');

export default function retrieve(context: vscode.ExtensionContext) {
  vscode.window.forceCode.statusBarItem.text = 'Retrieve Started';
  const slash: string = vscode.window.forceCode.pathSeparator;

  return vscode.window.forceCode.connect(context)
    .then(svc => showPackageOptions(svc.conn))
    .then(opt => getPackage(opt))
    .then(finished)
    .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));
  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================

  function getPackages(conn) {
    var requestUrl: string = conn.instanceUrl + '/_ui/common/apex/debug/ApexCSIAPI';
    var headers: any = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': 'sid=' + conn.accessToken,
    };
    // console.log(conn.accessToken)
    var body: string = 'action=EXTENT&extent=PACKAGES';
    return fetch(requestUrl, { method: 'POST', headers, body }).then(function (response) {
      return response.text();
    }).then(function (json) {
      return JSON.parse(json.replace('while(1);\n', '')).PACKAGES.packages;
    });
  }

  function showPackageOptions(conn) {
    return getPackages(conn).then(packages => {
      let options: vscode.QuickPickItem[] = packages
        .map(pkg => {
          return {
            label: `$(briefcase) ${pkg.Name}`,
            detail: `Package ${pkg.Id}`,
            description: pkg.Name,
          };
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
    });
  }

  // =======================================================================================================================================
  function getPackage(option: vscode.QuickPickItem) {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Retrieving ' + option.description;
    return new Promise(function (resolve, reject) {
      if (option.description === 'unpackaged') {
        vscode.window.forceCode.conn.metadata.describe().then(res => {
          var types: any[] = res.metadataObjects.map(r => {
            return { name: r.xmlName, members: '*' };
          });
          resolve(vscode.window.forceCode.conn.metadata.retrieve({
            unpackaged: { types: types },
            apiVersion: vscode.window.forceCode.config.apiVersion || vscode.window.forceCode.conn.version,
          }).stream());
        });
      } else {
        resolve(vscode.window.forceCode.conn.metadata.retrieve({
          packageNames: [option.description],
          apiVersion: vscode.window.forceCode.config.apiVersion || vscode.window.forceCode.conn.version,
        }).stream());
      }
    }).then(function (stream: NodeJS.ReadableStream) {
      return new Promise(function (resolve, reject) {
        vscode.window.forceCode.conn.metadata.pollTimeout = (vscode.window.forceCode.config.pollTimeout || 600) * 1000;
        var bufs: any = [];
        stream.on('data', function (d) {
          bufs.push(d);
        });
        stream.on('error', function (err) {
          reject(err);
        });
        stream.on('end', function () {
          var reader: any[] = ZIP.Reader(Buffer.concat(bufs));
          reader.forEach(function (entry) {
            if (entry.isFile()) {
              var name: string = entry.getName();
              var data: NodeBuffer = entry.getData();
              var newName: string = name.replace(option.description + slash, '');
              // Here is  possiblity
              fs.outputFileSync(vscode.workspace.rootPath + slash + vscode.window.forceCode.config.src + slash + newName, data);
            }
          });
          resolve();
        });
      });
    });


  }
  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================
  function finished(res): boolean {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Retrieve Finished';
    return true;
  }
}
