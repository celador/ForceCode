import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';
var logger: any = (function (fs) {
    const slash: string = vscode.window.forceCode.pathSeparator;
    const statsPath: string = `${vscode.workspace.rootPath}${slash}DeployStatistics.log`;
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
export default logger;
