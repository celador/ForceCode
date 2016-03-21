import * as vscode from 'vscode';
interface Constants{
    PEEK_FILTER: vscode.DocumentFilter[];
    APEX_FILTER: vscode.DocumentFilter[];
}
const peekFilter: vscode.DocumentFilter[] = [
    {
        language: 'typescript',
        scheme: 'file'
    }, {
        language: 'javascript',
        scheme: 'file'
    }
];
const apexFilter: vscode.DocumentFilter[] = [
    {
        language: 'apex',
        scheme: 'file'
    }, {
        language: 'javascript',
        scheme: 'file'
    }
];
const constants: Constants = {
    APEX_FILTER: apexFilter,
    PEEK_FILTER: peekFilter,
};
export default constants;
