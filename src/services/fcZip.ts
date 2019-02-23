import * as compress from 'compressing';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import { getAnyFolderNameFromTT, getAnyExtNameFromTT } from '../parsers/open';
import { parseString } from 'xml2js';

/**
 * @private zipFiles
 * Given an array of file paths, make a zip file and add all
 * then returns the resulting zip stream (not actual file) for use.
 * @param {String[]} fileList - Array of file paths
 * @return {Zip} - zip stream
 */
export function zipFiles(fileList: string[], root: string, lwcPackageXML?: string) {
  var zip: any = new compress.zip.Stream();
  // Add folders and files to zip object for each file in the list
  fileList.forEach(function(file) {
    const filePath: string = path.join(
      lwcPackageXML && file === 'package.xml' ? lwcPackageXML : root,
      file
    );
    zip.addEntry(filePath, {
      relativePath: file.indexOf('.') !== -1 ? file : file.split(path.sep)[0],
    });
  });

  return zip;
}

export interface PXMLMember {
  members: string[];
  name: string;
}

export interface PXML {
  Package: {
    types: PXMLMember[];
    version: string;
  };
}

export function getFileListFromPXML(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const projectRoot: string = vscode.window.forceCode.projectRoot;
    var xmlFilePath: string = path.join(projectRoot, 'package.xml');
    var data: any = fs.readFileSync(xmlFilePath);
    var fileList: string[] = [];
    fileList.push('package.xml');
    if (fs.existsSync(path.join(projectRoot, 'destructiveChanges.xml'))) {
      fileList.push('destructiveChanges.xml');
    }
    if (fs.existsSync(path.join(projectRoot, 'destructiveChangesPre.xml'))) {
      fileList.push('destructiveChangesPre.xml');
    }
    if (fs.existsSync(path.join(projectRoot, 'destructiveChangesPost.xml'))) {
      fileList.push('destructiveChangesPost.xml');
    }
    return parseString(data, { explicitArray: false }, function(err, dom: PXML) {
      if (err) {
        reject(err);
      } else {
        if (!dom.Package.types) {
          resolve(fileList);
        }
        toArray(dom.Package.types).forEach(curType => {
          var folder: string = getAnyFolderNameFromTT(curType.name);
          var ext = getAnyExtNameFromTT(curType.name);
          if (folder) {
            var theExt: string = '.' + ext;
            if (folder === 'aura' || folder === 'lwc') {
              theExt = '';
            }
            toArray(curType.members).forEach(curMem => {
              if (fs.existsSync(path.join(projectRoot, folder, curMem + theExt))) {
                fileList.push(path.join(folder, curMem + theExt));
                if (folder !== 'aura' && folder != 'lwc') {
                  if (
                    fs.existsSync(path.join(projectRoot, folder, curMem + theExt + '-meta.xml'))
                  ) {
                    fileList.push(path.join(folder, curMem + theExt + '-meta.xml'));
                  }
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

export function toArray(toConvert): any[] {
  if (!Array.isArray(toConvert)) {
    return [toConvert];
  } else {
    return toConvert;
  }
}
