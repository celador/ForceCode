import * as vscode from 'vscode';
interface Constants {
    APEX_FILTER: vscode.DocumentFilter[];
    CLIENT_ID: string;
    FORCE_SERVICE: string;
    FORCECODE_KEYCHAIN: string;
    OUTPUT_CHANNEL: string;
    OUTPUT_CHANNEL_NAME: string;
    DEBUG_LEVEL_NAME: string;
    LOG_TYPE: string;
    API_VERSION: string;
    MAX_TIME_BETWEEN_FILE_CHANGES: number;
    GA_TRACKING_ID: string;
}
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
    CLIENT_ID: 'SalesforceDevelopmentExperience',
    FORCE_SERVICE: 'forceService',
    OUTPUT_CHANNEL: 'outputChannel',
    OUTPUT_CHANNEL_NAME: 'ForceCode',
    DEBUG_LEVEL_NAME: 'Execute_Anonymous_Debug',
    LOG_TYPE: 'DEVELOPER_LOG',
    API_VERSION: '43.0',
    MAX_TIME_BETWEEN_FILE_CHANGES: 10000,
    GA_TRACKING_ID: 'UA-127320954-1'
};
export default constants;
