import * as vscode from 'vscode';
interface Constants {
    APEX_FILTER: vscode.DocumentFilter[];
    FORCE_SERVICE: string;
    FORCECODE_KEYCHAIN: string;
    PEEK_FILTER: vscode.DocumentFilter[];
    OUTPUT_CHANNEL: string;
    OUTPUT_CHANNEL_NAME: string;
    DEBUG_LEVEL_NAME: string;
    LOG_TYPE: string;
}
const peekFilter: vscode.DocumentFilter[] = [
    {
        language: 'typescript',
        scheme: 'file',
    }, {
        language: 'javascript',
        scheme: 'file',
    },
];
const apexFilter: vscode.DocumentFilter[] = [
    {
        language: 'apex',
        scheme: 'file',
    }, {
        language: 'javascript',
        scheme: 'file',
    },
];
const constants: Constants = {
    FORCECODE_KEYCHAIN: 'yo-force',
    APEX_FILTER: apexFilter,
    FORCE_SERVICE: 'forceService',
    PEEK_FILTER: peekFilter,
    OUTPUT_CHANNEL: 'outputChannel',
    OUTPUT_CHANNEL_NAME: 'ForceCode',
    DEBUG_LEVEL_NAME: 'Execute_Anonymous_Debug',
    LOG_TYPE: 'DEVELOPER_LOG',
};
export default constants;
