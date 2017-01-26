import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';
import * as error from './../util/error';

var tools: any = require('cs-jsforce-metadata-tools');

export default function deploy(context: vscode.ExtensionContext) {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Deploy Started';
    vscode.window.forceCode.outputChannel.clear();
    var _consoleInfoReference: any = console.info;
    var _consoleErrorReference: any = console.error;
    var _consoleLogReference: any = console.log;
    // Here is replaceSrc possiblity
    const validationIdPath: string = `${vscode.workspace.rootPath}${path.sep}.validationId`;
    const statsPath: string = `${vscode.workspace.rootPath}${path.sep}DeployStatistics.log`;
    const deployPath: string = vscode.window.forceCode.workspaceRoot;
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
        pollInterval: vscode.window.forceCode.config.poll || 5000,
        pollTimeout: vscode.window.forceCode.config.pollTimeout ? (vscode.window.forceCode.config.pollTimeout * 1000) : 600000,
    };

    return vscode.window.forceCode.connect(context)
        .then(deployPackage)
        .then(finished)
        .catch(onError);
    // =======================================================================================================================================
    // =======================================================================================================================================
    function deployPackage(conn) {
        // Proxy Console.info to capture the status output from metadata tools
        registerProxy();
        Object.assign(deployOptions, vscode.window.forceCode.config.deployOptions);
        // vscode.window.forceCode.outputChannel.show();
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
            vscode.window.forceCode.statusBarItem.text = 'ForceCode: Deployed $(thumbsup)';
            if (deployOptions.checkOnly) {
                fs.writeFileSync(validationIdPath, res.id);
            }
        } else {
            vscode.window.forceCode.statusBarItem.text = 'ForceCode: Deploy Errors $(thumbsdown)';
        }
        tools.reportDeployResult(res, logger, deployOptions.verbose);
        logger.flush();
        unregisterProxy();
        return res;
    }
    function onError(err) {
        unregisterProxy();
        vscode.window.forceCode.statusBarItem.text = 'ForceCode: Deploy Errors $(thumbsdown)';
        return error.outputError(err, vscode.window.forceCode.outputChannel);
    }
    // =======================================================================================================================================
    function registerProxy() {
        console.info = function () {
            var msg: string = arguments[0];
            if (msg.match(/Deploy is Pending/)) {
                vscode.window.forceCode.statusBarItem.text = 'ForceCode: Deploy Pending';
            } else if (msg.match(/Components\:/)) {
                let cnt: string = msg.match(/\d*\/\d*/) ? msg.match(/\d*\/\d*/)[0] : '...';
                let icon: string = msg.match(/errors\: [1-9]/) ? 'thumbsdown' : 'thumbsup';
                vscode.window.forceCode.statusBarItem.text = `ForceCode: Deploying ${cnt} $(${icon})`;
            } else if (msg.match(/Tests\:/)) {
                let cnt: string = msg.match(/\d*\/\d*/) ? msg.match(/\d*\/\d*/)[0] : '...';
                let icon: string = msg.match(/errors\: [1-9]/) ? 'thumbsdown' : 'thumbsup';
                vscode.window.forceCode.statusBarItem.text = `ForceCode: Testing ${cnt} $(${icon})`;
            }
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
            // vscode.window.forceCode.outputChannel.appendLine(arguments[0]);
            return _consoleErrorReference.apply(this, arguments);
        };
    }
    function unregisterProxy() {
        console.info = _consoleInfoReference;
        console.log = _consoleLogReference;
        console.error = _consoleErrorReference;
    }
}



