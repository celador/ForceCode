import vscode = require('vscode');
export default class ForceCodeLogProvider implements vscode.TextDocumentContentProvider {
    provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
        var logId: string = uri.path.substring(1, 19);
        var url: string = `${vscode.window.forceCode.conn._baseUrl()}/sobjects/ApexLog/${logId}/Body`;
        return vscode.window.forceCode.conn.request(url).then(filterLog);
    }
}

export function filterLog(body: string) {
    if (vscode.window.forceCode.config.debugOnly) {
        var theLog = '';
        var showOutput = true;
        var debugLevel = ['USER_DEBUG'];
        if(vscode.window.forceCode.config.debugFilter)
        {
            debugLevel = vscode.window.forceCode.config.debugFilter.split('|');
        }
        body.split('\n').forEach(function(l) {
            var includeIt = false;
            debugLevel.forEach(function(i) {
                if(l.includes(i))
                {
                    includeIt = true;
                }
            });
            if(l.includes('CUMULATIVE_LIMIT_USAGE_END'))
            {
                showOutput = true;
            }
            else if(l.includes('CUMULATIVE_LIMIT_USAGE')) 
            {
                showOutput = false;
            }            
            if(((l.indexOf(':') !== 2 && l.indexOf(':', 5) !== 5 && theLog !== '') || includeIt) && showOutput) {
                // if it doesn't start with the time then we have a newline from debug logs or limit output
                theLog += l + '\n';
            }
        });
        return theLog;
    } else {
        return body;
    }
}
