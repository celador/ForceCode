import * as vscode from 'vscode';
import fs = require('fs-extra');
// import * as archiver from 'archiver';
import * as path from 'path';
import * as error from './../util/error';

var tools: any = require('cs-jsforce-metadata-tools');

export default function deploy(context: vscode.ExtensionContext) {
    vscode.window.setStatusBarMessage('ForceCode: Deploy Started');


    const slash: string = vscode.window.forceCode.pathSeparator;
    const validationIdPath: string = `${vscode.workspace.rootPath}${slash}.validationId`;
    const deployPath: string = `${vscode.workspace.rootPath}${slash}src`;
    const statsPath: string = `${vscode.workspace.rootPath}${slash}DeployStatistics.log`;

    var logger: any = (function (fs) {
        var buffer: string = '';
        return {
            log: log,
            flush: flush,
        };
        function log(val) {
            buffer += (val + '\n');
        }
        function flush() {
            var logFile: any = path.resolve(statsPath);
            fs.appendFileSync(logFile, buffer, 'utf8');
            buffer = '';
        }
    } (fs));
    var deployOptions: any = {
        username: vscode.window.forceCode.config.username,
        password: vscode.window.forceCode.config.password,
        loginUrl: 'https://login.salesforce.com',
        checkOnly: true,
        testLevel: 'RunLocalTests',
        verbose: false,
        ignoreWarnings: false,
        rollbackOnError: true,
        pollInterval: 5000,
        pollTimeout: vscode.window.forceCode.config.pollTimeout ? (vscode.window.forceCode.config.pollTimeout * 1000) : 600000,
    };

    return vscode.window.forceCode.connect(context)
        .then(svc => deployPackage(svc.conn))
        .then(finished)
        .catch(err => error.outputError(err, vscode.window.forceCode.outputChannel));
    // =======================================================================================================================================
    // =======================================================================================================================================
    function deployPackage(conn) {
        Object.assign(deployOptions, vscode.window.forceCode.config.deployOptions);
        if (fs.existsSync(validationIdPath) && !deployOptions.checkOnly) {
            var validationId: string = fs.readFileSync(validationIdPath, 'utf-8');
            fs.unlinkSync(validationIdPath);
            return tools.deployRecentValidation(validationId, deployOptions);
        } else {
            return tools.deployFromDirectory(deployPath, deployOptions);
        }
    }
    // =======================================================================================================================================
    function finished(res): boolean {
        if (res.success) {
            vscode.window.setStatusBarMessage('ForceCode: Deployed $(thumbsup)');
            if (deployOptions.checkOnly) {
                fs.writeFileSync(validationIdPath, res.id);
            }
        } else {
            vscode.window.setStatusBarMessage('ForceCode: Deploy Errors $(thumbsdown)');
        }
        if (deployOptions.verbose) {
            tools.reportDeployResult(res, logger, deployOptions.verbose);
            logger.flush();
        }
        return res;
    }
    // =======================================================================================================================================
}


























// var DEPLOY_OPTIONS: string[] = "allowMissingFiles,autoUpdatePackage,checkOnly,ignoreWarnings,performRetrieve,purgeOnDelete,rollbackOnError,runAllTests,runTests,singlePackage,testLevel".split(',');

// /* @private */
// function noop() { }


// function deployFromZipStream(zipStream, options) {
//     var logger: any = options.logger || { log: noop };
//     vscode.window.setStatusBarMessage(`ForceCode: Deploying to server... $(beaker)`);
//     conn.metadata.pollTimeout = options.pollTimeout || 60 * 1000; // timeout in 60 sec by default
//     conn.metadata.pollInterval = options.pollInterval || 5 * 1000; // polling interval to 5 sec by default
//     var deployOpts: any = {};
//     DEPLOY_OPTIONS.forEach(function (prop) {
//         if (typeof options[prop] !== 'undefined') { deployOpts[prop] = options[prop]; }
//     });
//     return conn.metadata.deploy(zipStream, deployOpts);
// };

// function deployFromFileMapping(mapping, options) {
//     var archive: any = archiver('zip');
//     archiver.bulk(mapping);
//     archive.finalize();
//     return deployFromZipStream(archive, options);
// }


// function deployFromDirectory(packageDirectoryPath, options) {
//     const slash: string = vscode.window.forceCode.pathSeparator;

//     return deployFromFileMapping({
//         expand: true,
//         cwd: path.join(packageDirectoryPath, '..'),
//         src: [path.basename(packageDirectoryPath) + slash + '**'],
//     }, options);
// }


// function checkDeployStatus(processId, options) {
//     return conn.metadata.checkDeployStatus(processId, { details: true });
// }


// function reportDeployResult(res, logger, verbose) {
//     var message =
//         res.success ? 'Deploy Succeeded' + (res.status === 'SucceededPartial' ? ' Patially.' : '.') :
//             res.done ? 'Deploy Failed.' :
//                 'Deploy Not Completed Yet.';
//     logger.log(message);
//     if (res.errorMessage) {
//         logger.log(res.errorStatusCode + ': ' + res.errorMessage);
//     }
//     logger.log('');
//     logger.log('Id: ' + res.id);
//     logger.log('Status: ' + res.status);
//     logger.log('Success: ' + res.success);
//     logger.log('Done: ' + res.done);
//     logger.log('Number Component Errors; ' + res.numberComponentErrors);
//     logger.log('Number Components Deployed: ' + res.numberComponentsDeployed);
//     logger.log('Number Components Total: ' + res.numberComponentsTotal);
//     logger.log('Number Test Errors; ' + res.numberTestErrors);
//     logger.log('Number Tests Completed: ' + res.numberTestsCompleted);
//     logger.log('Number Tests Total: ' + res.numberTestsTotal);
//     reportDeployResultDetails(res.details, logger, verbose);
// }

// function reportDeployResultDetails(details, logger, verbose) {
//     if (details) {
//         logger.log('');
//         if (verbose) {
//             var successes = asArray(details.componentSuccesses);
//             if (successes.length > 0) {
//                 logger.log('Successes:');
//             }
//             successes.forEach(function (s) {
//                 var flag =
//                     String(s.changed) === 'true' ? '(M)' :
//                         String(s.created) === 'true' ? '(A)' :
//                             String(s.deleted) === 'true' ? '(D)' :
//                                 '(~)';
//                 logger.log(' - ' + flag + ' ' + s.fileName + (s.componentType ? ' [' + s.componentType + ']' : ''));
//             });
//         }
//         var failures = asArray(details.componentFailures);
//         if (failures) {
//             if (failures.length > 0) {
//                 logger.log('Failures:');
//             }
//             failures.forEach(function (f) {
//                 logger.log(
//                     ' - ' + f.problemType + ' on ' + f.fileName +
//                     (typeof f.lineNumber !== 'undefined' ?
//                         ' (' + f.lineNumber + ':' + f.columnNumber + ')' :
//                         '') +
//                     ' : ' + f.problem
//                 );
//             });
//         }
//         var testResult = details.runTestResult;
//         if (testResult && Number(testResult.numTestsRun) > 0) {
//             logger.log('');
//             logger.log('Test Total Time: ' + Number(testResult.totalTime));
//             logger.log('');
//             if (verbose) {
//                 var testSuccesses = asArray(testResult.successes) || [];
//                 if (testSuccesses.length > 0) {
//                     logger.log('Test Successes:');
//                 }
//                 testSuccesses.forEach(function (s) {
//                     logger.log(' - ' + (s.namespace ? s.namespace + '__' : '') + s.name + '.' + s.methodName);
//                 });
//             }
//             var testFailures = asArray(testResult.failures) || [];
//             if (testFailures.length > 0) {
//                 logger.log('Test Failures:');
//             }
//             testFailures.forEach(function (f) {
//                 logger.log(' - ' + (typeof f.namespace === 'string' ? f.namespace + '__' : '') + f.name + '.' + f.methodName);
//                 logger.log('     ' + f.message);
//                 if (f.stackTrace) {
//                     f.stackTrace.split(/\n/).forEach(function (line) {
//                         logger.log('        at ' + line);
//                     });
//                 }
//             });
//             if (verbose) {
//                 var codeCoverages = asArray(testResult.codeCoverage) || [];
//                 if (codeCoverages.length > 0) {
//                     logger.log('Code Coverage:');
//                 }
//                 codeCoverages.forEach(function (s) {
//                     var coverage = Math.floor(100 - 100 * (s.numLocationsNotCovered / s.numLocations));
//                     if (isNaN(coverage)) { coverage = 100; }
//                     logger.log(
//                         ' - ' +
//                         '[' +
//                         (coverage < 10 ? '  ' : coverage < 100 ? ' ' : '') + coverage +
//                         ' %] ' +
//                         (typeof s.namespace === 'string' ? s.namespace + '__' : '') + s.name
//                     );
//                 });
//             }
//         }
//     }
// }

// function asArray(arr) {
//     if (!arr) { return []; }
//     if (Object.prototype.toString.apply(arr) !== '[object Array]') { arr = [arr]; }
//     return arr;
// }



// module.exports = {
//     deployFromZipStream: deployFromZipStream,
//     deployFromFileMapping: deployFromFileMapping,
//     deployFromDirectory: deployFromDirectory,
//     checkDeployStatus: checkDeployStatus,
//     reportDeployResult: reportDeployResult
// };
