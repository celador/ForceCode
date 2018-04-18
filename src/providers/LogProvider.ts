import vscode = require('vscode');

export default class ForceCodeLogProvider implements vscode.TextDocumentContentProvider {
    provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
        var logId: string = uri.path.substring(1, 19);
        if(logId === 'debugLog') {
            logId = undefined;
        }
        return vscode.window.forceCode.dxCommands.getDebugLog(logId).then(filterLog);
    }
}

export function filterLog(body: string): string {
    if (vscode.window.forceCode.config.debugOnly) {
        return body.split('\n').filter(l => l.match(new RegExp(vscode.window.forceCode.config.debugFilter || 'USER_DEBUG'))).join('\n');
    } else {
        return body;
    }
}