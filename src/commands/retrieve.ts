'use strict';
import * as vscode from 'vscode';
import {IForceService} from './../services';
const fs: any = require('fs-extra');
const jszip: any = require('jszip');
const unzip = require('unzip');
const stream = require('stream');

// console.log(‘data of source.txt is gzipped, the unzipped and then written to target.txt’);

// var fs = require('fs');
// var fstream = require('fstream');
// var path = require('path');
// var stream = require('readable-stream');
// var jsforce = require('jsforce');
// var archiver = require('archiver');
// var xml2js = require('xml2js');
// var Promise = jsforce.Promise;

var RETRIEVE_OPTIONS =
    "apiVersion,packageNames,singlePackage,specificFiles,unpackaged".split(',');

/**
 *
 */
// export module.exports = {
//   checkRetrieveStatus: checkRetrieveStatus,
//   extractZipContents: extractZipContents,
//   reportRetrieveResult: reportRetrieveResult,
//   retrieve: retrieve,
//   retrieveByPackageNames: retrieveByPackageNames,
//   retrieveByPackageXML: retrieveByPackageXML,
//   retrieveByTypes: retrieveByTypes,
// };

/* @private */
function noop() { }

/**
 *
 */
export default function retrieve(force: IForceService) {
    var service: any = undefined;
    // Get Package(s) from a prompt
    var packages: string[] = ['Test'];
    return force.connect()
        .then(svc => {
            service = svc;
            return service.conn.metadata.retrieve({
                apiVersion: '34.0',
                packageNames: packages,
                singlePackage: true,
                // unpackaged: {
                // }
            });
        })
        .then(res => {
            return checkRetrieveStatus(service, res.id);
        }).then(res => {
            // console.log(res);
            return jszip(res.zipFile, { base64: true, createFolders: true });
        })
        .then(zip => {
            var buffer = zip.generate({ type: "nodebuffer" });
            var bufferStream = new stream.PassThrough();
            bufferStream.end( buffer );
            bufferStream.pipe(unzip.Extract({ path: `${vscode.workspace.rootPath}/src` }));
        });
};

function checkRetrieveStatus(service, id) {
    var checkCount: number = 0;
    return new Promise(function(resolve, reject) {
        // Recursively get the status of the container, using promises
        nextStatus();
        function nextStatus() {
            checkCount += 1;
            vscode.window.setStatusBarMessage('ForceCode: Retrieval attempt ' + checkCount);
            return service.conn.metadata.checkRetrieveStatus(id).then(res => {
                // Throttle the ReCheck of the compile status, to use fewer http requests (reduce effects on SFDC limits)
                isFinished(res) ? resolve(res) : setTimeout(() => nextStatus(), 500);
            });
        }
        // Set a timeout to auto fail the compile after 30 seconds
        setTimeout(function() {
            reject();
        }, 30000);
        function isFinished(res) {
            if (res.status === 'Succeeded') {
                return true;
            } else if (res.status === 'Failed') {
                reject();
                return true;
            } else {
                return false;
            }
        }
    });
}

// /**
//  *
//  */
// function retrieveByTypes(typeList, options) {
//     var types = typeList.split(/\s*;\s*/)
//         .filter(function(p) { return p; })
//         .map(function(p) {
//             var pair = p.split(/\s*:\s*/);
//             var name = pair[0];
//             var members = pair[1] ? pair[1].split(/\s*,\s*/) : ['*'];
//             return { name: name, members: members };
//         })
//     options.unpackaged = { types: types };
//     return retrieve(options);
// }

// /**
//  *
//  */
// function retrieveByPackageNames(packageNames, options) {
//     options.packageNames = packageNames;
//     return retrieve(options);
// }

// /**
//  *
//  */
// function retrieveByPackageXML(xmlFilePath, options) {
//     return new Promise(function(resolve, reject) {
//         fs.readFile(xmlFilePath, 'utf-8', function(err, data) {
//             if (err) { reject(err); } else { resolve(data); }
//         });
//     }).then(function(data) {
//         return new Promise(function(resolve, reject) {
//             xml2js.parseString(data, { explicitArray: false }, function(err, dom) {
//                 if (err) { reject(err); } else { resolve(dom); }
//             });
//         });
//     }).then(function(dom) {
//         delete dom.Package.$;
//         options.unpackaged = dom.Package;
//         return retrieve(options);
//     });
// }



/**
 *
 */
function reportRetrieveResult(res, logger, verbose) {
    var message =
        String(res.success) === 'true' ? 'Retrieve Succeeded.' :
            String(res.done) === 'true' ? 'Retrieve Failed.' :
                'Retrieve Not Completed Yet.';
    logger.log(message);
    if (res.errorMessage) {
        logger.log(res.errorStatusCode + ': ' + res.errorMessage);
    }
    logger.log('');
    logger.log('Id: ' + res.id);
    logger.log('Status: ' + res.status);
    logger.log('Success: ' + res.success);
    logger.log('Done: ' + res.done);
    if (verbose) {
        reportRetreiveFileProperties(res.fileProperties, logger);
    }
}

function asArray(arr) {
    if (!arr) { return []; }
    if (Object.prototype.toString.apply(arr) !== '[object Array]') { arr = [arr]; }
    return arr;
}

function reportRetreiveFileProperties(fileProperties, logger) {
    fileProperties = asArray(fileProperties);
    if (fileProperties.length > 0) {
        logger.log('');
        logger.log('Files:');
        fileProperties.forEach(function(f) {
            logger.log(' - ' + f.fileName + (f.type ? ' [' + f.type + ']' : ''));
        });
    }
}

/**
 *
 */
// function extractZipContents(zipFileContent, dirMapping, logger, verbose) {
//     logger.log('');
//     return new Promise(function(resolve, reject) {
//         var waits = [];
//         var zipStream = new stream.PassThrough();
//         zipStream.end(new Buffer(zipFileContent, 'base64')).catch(err => console.log(err));
//         zipStream
//             .pipe(unzip.Parse())
//             .on('entry', function(entry) {
//                 var filePaths = entry.path.split('/');
//                 var packageName = filePaths[0];
//                 var directory = dirMapping[packageName] || dirMapping['*'];
//                 if (directory) {
//                     var restPath = filePaths.slice(1).join('/');
//                     var realPath = path.join(directory, restPath);
//                     waits.push(new Promise(function(rsv, rej) {
//                         logger.log('Extracting: ', realPath);
//                         entry.pipe(
//                             fstream.Writer({
//                                 type: entry.type,
//                                 path: realPath
//                             })
//                         )
//                             .on('finish', rsv)
//                             .on('error', rej);
//                     }));
//                 } else {
//                     entry.autodrain();
//                 }
//             })
//             .on('finish', function() {
//                 setTimeout(function() {
//                     Promise.all(waits).then(resolve, reject);
//                 }, 1000);
//             })
//             .on('error', reject);
//     });
// }

