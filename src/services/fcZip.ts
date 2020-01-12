import * as compress from 'compressing';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import { parseString } from 'xml2js';
import { toArray } from '../util';
import { IMetadataObject } from '../forceCode';
import { getToolingTypeMetadata } from '../parsers';
import { getVSCodeSetting } from './configuration';
import globule = require('globule');

/**
 * @private zipFiles
 * Given an array of file paths, make a zip file and add all
 * then returns the resulting zip stream (not actual file) for use.
 * @param {String[]} fileList - Array of file paths
 * @return {Zip} - zip stream
 */
export function zipFiles(
  fileList: string[],
  root: string,
  lwcPackageXML?: string
): compress.zip.Stream {
  var zip: compress.zip.Stream = new compress.zip.Stream();
  // Add folders and files to zip object for each file in the list
  fileList.forEach(file => {
    const filePath: string = path.join(
      lwcPackageXML && file === 'package.xml' ? lwcPackageXML : root,
      file
    );
    // this allows a filter on the files/folders
    getFileList(filePath).forEach(theFile => {
      var theFilePath;
      var relativePath;
      if (filePath === theFile) {
        // file
        theFilePath = filePath;
        relativePath = file.indexOf('.') !== -1 ? file : file.split(path.sep)[0];
      } else {
        // directory
        theFilePath = filePath + path.sep + theFile;
        relativePath = file === '' ? theFile : file + path.sep + theFile;
      }
      zip.addEntry(theFilePath, {
        relativePath,
      });
    });
  });

  return zip;
}

/**
 * Takes directory and recursively adds all child files to the list
 * with all paths being relative to the original path.
 * @param {String} root - path (absolute) of folder to recurse
 * @return {String[]} - Array of paths relative to given root
 */
function getFileList(root: string) {
  return getFilteredFileList(innerGetFileList(root));

  // We trap the relative root in a closure then
  // Perform the recursive file search
  function innerGetFileList(localPath: string) {
    var fileslist: any[] = []; // List of files
    var files: string[];
    if (!fs.statSync(localPath).isDirectory()) {
      files = [localPath];
    } else {
      files = fs.readdirSync(localPath); // Files in current 'sfdc' directory
    }

    files.forEach(file => {
      var pathname: string = file === localPath ? file : localPath + path.sep + file;
      var stat: any = fs.lstatSync(pathname);

      // If file is a directory, recursively add it's children
      if (stat.isDirectory()) {
        fileslist = fileslist.concat(innerGetFileList(pathname));
      } else {
        fileslist.push(pathname.replace(root + path.sep, ''));
      }
    });
    return fileslist;
  }
}

// read the .forceignore file, if it exists
function readForceIgnore(): { [key: string]: boolean } {
  const forceIgnorePath: string = vscode.window.forceCode.workspaceRoot + path.sep + '.forceignore';
  var ignoreObject: { [key: string]: boolean } = {};

  if (fs.existsSync(forceIgnorePath)) {
    const forceIgnoreContents: string = fs.readFileSync(forceIgnorePath).toString();

    // parse the ignore file and put into key: value format
    forceIgnoreContents.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (line !== '' && !line.startsWith('#')) {
        ignoreObject[line] = true;
      }
    });
  }

  return ignoreObject;
}

export function getFilteredFileList(files: string[]): string[] {
  // get ignore settings from Forcecode workspace settings and .forceignore
  const ignoreFilesSettings: { [key: string]: boolean } = Object.assign(
    {},
    getVSCodeSetting('filesExclude'),
    readForceIgnore()
  );

  const ignoreFiles: string[] = Object.keys(ignoreFilesSettings)
    .map(key => {
      return { key: key, value: ignoreFilesSettings[key] };
    })
    .filter(setting => setting.value === true && !setting.key.endsWith('*-meta.xml'))
    .map(setting => setting.key);

  var fileslist: string[] = [];

  files.forEach(file => {
    if (!globule.isMatch(ignoreFiles, file, { matchBase: true, dot: true })) {
      fileslist.push(file);
    }
  });

  return fileslist;
}

export interface PXMLMember {
  members: string[];
  name: string;
  defType?: string;
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
          const ttMeta: IMetadataObject | undefined = getToolingTypeMetadata(curType.name);
          if (ttMeta) {
            const folder: string = ttMeta.directoryName;
            var ext: string = ttMeta.suffix;
            var theExt: string = '.' + ext;
            if (folder === 'aura' || folder === 'lwc') {
              theExt = '';
            }
            toArray(curType.members).forEach(curMem => {
              curMem = curMem.replace('/', path.sep).split('.')[0];
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
