import * as vscode from 'vscode';
import { toArray, dxService, PXML } from '../services';
import constants from '../models/constants';
import * as xml2js from 'xml2js';
import * as fs from 'fs-extra';

function sortFunc(a: any, b: any): number {
    var aStr = a.label.toUpperCase();
    var bStr = b.label.toUpperCase();
    return aStr.localeCompare(bStr);
}

export default function packageBuilder(buildPackage?: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
        var options: any[] = vscode.window.forceCode.describe.metadataObjects
            .filter(el => { return !el.inFolder }).map(r => {
                return {
                    label: r.xmlName,
                    detail: r.directoryName,
                }
            });
        options.sort(sortFunc);
        let config: {} = {
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: 'Select types',
            canPickMany: true
        };
        vscode.window.showQuickPick(options, config).then(types => {
            const typesArray: any[] = toArray(types);
            if (dxService.isEmptyUndOrNull(typesArray)) {
                reject();
            }
            var mappedTypes: any[] = typesArray.map(curType => {
                if (!curType) {
                    reject();
                }
                return { name: curType.label, members: '*' }
            });
            if(!buildPackage) {
                resolve(mappedTypes);
            } else {
                // generate the file, then ask the user where to save it
                const builder = new xml2js.Builder();
                var packObj: PXML = {
                    Package: {
                        types: mappedTypes,
                        version: vscode.window.forceCode.config.apiVersion || constants.API_VERSION
                    },
                }
                var xml: string = builder.buildObject(packObj)
                    .replace('<Package>', '<Package xmlns="http://soap.sforce.com/2006/04/metadata">')
                    .replace(' standalone="yes"', '');
                const defaultURI: vscode.Uri = {
                    scheme: 'file',
                    path: vscode.window.forceCode.projectRoot.split('\\').join('/'),
                    fsPath: vscode.window.forceCode.projectRoot,
                    authority: undefined,
                    query: undefined,
                    fragment: undefined,
                    with: undefined,
                    toJSON: undefined
                }
                vscode.window.showSaveDialog({ filters: { 'XML': ['xml'] }, defaultUri: defaultURI }).then(uri => {
                    if(!uri) {
                        resolve();
                    } else {
                        resolve(fs.outputFileSync(uri.fsPath, xml));
                    }
                });
            }
        });
    });
}
