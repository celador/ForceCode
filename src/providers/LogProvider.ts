import vscode = require('vscode');
export default class ForceCodeLogProvider implements vscode.TextDocumentContentProvider {
    provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
        var logId: string = uri.path.substring(1, 19);
        var url: string = `${vscode.window.forceCode.restUrl()}/sobjects/ApexLog/${logId}/Body`;
        return vscode.window.forceCode.conn.request(url).then(function (body: string) {
            if (vscode.window.forceCode.config.debugOnly) {
                return body.split('\n').filter(l => l.match(new RegExp(vscode.window.forceCode.config.debugFilter || 'USER_DEBUG'))).join('\n');
            } else {
                return body;
            }
        });
    }
}
