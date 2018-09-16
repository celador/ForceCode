import * as compress from 'compressing';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import { getAnyFolderNameFromTT, getAnyExtNameFromTT } from '../parsers/open';
import { parseString } from 'xml2js';

/**
 * @private zipFiles
 * Given an array of file paths, make a zip file and add all
 * then returns the resulting zip object (not actual file) for use.
 * @param {String[]} fileList - Array of file paths
 * @return {Zip} - zip blob for use
 */
export function zipFiles(fileList: string[], root: string) {
    var zip: any = new compress.zip.Stream();
    const projectRoot: string = vscode.window.forceCode.projectRoot;
    // Add folders and files to zip object for each file in the list
    fileList.forEach(function (file) {
        zip.addEntry(path.join(projectRoot, file), { relativePath: file.indexOf('.') !== -1 ? file : 'aura' });
    });

    return zip;
}

interface Member {
    members: string[],
    name: string,
}

interface PXML {
    Package: {
        types: Member[],
        version: string;
    }
}

export function getFileListFromPXML(): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const projectRoot: string = vscode.window.forceCode.projectRoot;
        var xmlFilePath: string = path.join(projectRoot, 'package.xml');
        var data: any = fs.readFileSync(xmlFilePath);
        var fileList: string[] = [];
        return parseString(data, { explicitArray: false }, function (err, dom: PXML) {
            if (err) { reject(err); } else {
                if (!dom.Package.types) {
                    return undefined;
                }
                toArray(dom.Package.types).forEach(curType => {
                    var folder: string = getAnyFolderNameFromTT(curType.name);
                    var ext = getAnyExtNameFromTT(curType.name);
                    if (folder) {
                        var theExt: string = '.' + ext;
                        if (folder === 'aura') {
                            theExt = '';
                        }
                        toArray(curType.members).forEach(curMem => {
                            if (fs.existsSync(path.join(projectRoot, folder, curMem + theExt))) {
                                fileList.push(path.join(folder, curMem + theExt));
                                if (folder !== 'aura') {
                                    fileList.push(path.join(folder, curMem + theExt + '-meta.xml'));
                                }
                            }
                        });
                    }
                });
                resolve(fileList);
            }
        });
    });
}

function toArray(toConvert): any[] {
    if (!Array.isArray(toConvert)) {
        return [toConvert];
    } else {
        return toConvert;
    }
}