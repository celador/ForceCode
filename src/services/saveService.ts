import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { compile, FCCancellationToken } from '../commands';
import klaw = require('klaw');
import { notifications } from '.';

interface PreSaveFile {
  path: string;
  fileContents: string;
  saving: boolean;
  queue: boolean;
}

export class SaveService {
  private static instance: SaveService;
  private preSaveFiles: PreSaveFile[];

  constructor() {
    this.preSaveFiles = [];
  }

  public static getInstance() {
    if (!SaveService.instance) {
      SaveService.instance = new SaveService();
    }
    return SaveService.instance;
  }

  /*
    Will return true if the file was added to the array, false otherwise.
    This needs to be in place for those who don't use autoCompile and for
    unsuccessful saves to the server...mainly for file comparison
  */
  public addFile(documentPath: string): boolean {
    const existingFile: PreSaveFile | undefined = this.getFile(documentPath);

    if (existingFile) {
      return false;
    } else {
      // we need to read the file since the document has unsaved content
      const fileContents: string = fs
        .readFileSync(documentPath)
        .toString()
        .trim();
      this.preSaveFiles.push({
        path: documentPath,
        fileContents: fileContents,
        saving: false,
        queue: false,
      });
      return true;
    }
  }

  public addFilesInFolder(folder: string): Promise<boolean> {
    const self: SaveService = this;
    return new Promise<boolean>((resolve, reject) => {
      klaw(folder)
        .on('data', file => {
          if (file.stats.isFile()) self.addFile(file.path);
        })
        .on('end', () => {
          resolve(true);
        })
        .on('error', (err: Error, item: klaw.Item) => {
          notifications.writeLog(`ForceCode: Error reading ${item.path}. Message: ${err.message}`);
          reject(false);
        });
    });
  }

  public removeFilesInFolder(folder: string): boolean {
    const psFilesToRemove: PreSaveFile[] = this.getFilesInFolder(folder);
    if (psFilesToRemove.length > 0) {
      psFilesToRemove.forEach(f => this.removeFile(f.path));
      return true;
    } else {
      return false;
    }
  }

  public compareContents(documentPath: string, serverContents: string): boolean {
    serverContents = serverContents.trim();
    // workaround for SF always saving VF pages with <apex:page > instead or <apex:page>
    if (serverContents.startsWith('<apex:page >')) {
      serverContents = serverContents.replace('<apex:page >', '<apex:page>');
    }
    const oldFileContents: PreSaveFile | undefined = this.getFile(documentPath);
    if (oldFileContents) {
      return oldFileContents.fileContents === serverContents;
    }
    // no data to compare to
    return true;
  }

  public saveFile(
    document: vscode.TextDocument,
    forceCompile: boolean,
    cancellationToken: FCCancellationToken
  ): Promise<boolean> {
    // if the preSaveFile doesn't exist, make it. this means someone is saving via ctr+shift+s or right click and hasn't changed the file+saved it
    this.addFile(document.fileName);
    const fileIndex: number = this.getFileIndex(document.fileName);
    if (this.preSaveFiles[fileIndex].saving) {
      this.preSaveFiles[fileIndex].queue = true;
      return Promise.resolve(true);
    }
    this.preSaveFiles[fileIndex].saving = true;
    const self: SaveService = this;
    return new Promise((resolve, reject) => {
      compile(document, forceCompile, cancellationToken)
        .then(success => {
          self.preSaveFiles[fileIndex].saving = false;
          if (success) {
            // update the file time for start up file change checks
            var mTime: Date = new Date();
            fs.utimesSync(document.fileName, mTime, mTime);
            // remove the pre-save file version if successful
            if (self.preSaveFiles[fileIndex].queue) {
              self.preSaveFiles[fileIndex].queue = false;
              return resolve(self.saveFile(document, true, cancellationToken));
            } else {
              return resolve(self.removeFile(document.fileName));
            }
          } else {
            return resolve(false);
          }
        })
        .catch(reject);
    });
  }

  private removeFile(thePath: string): boolean {
    const fileIndex: number = this.getFileIndex(thePath);

    if (fileIndex > -1) {
      this.preSaveFiles.splice(fileIndex, 1);
      return true;
    } else {
      return false;
    }
  }

  private getFile(thePath: string): PreSaveFile | undefined {
    const fileIndex: number = this.getFileIndex(thePath);
    if (fileIndex > -1) {
      return this.preSaveFiles[fileIndex];
    } else {
      return undefined;
    }
  }

  private getFilesInFolder(folder: string): PreSaveFile[] {
    return this.preSaveFiles.filter(psFile => psFile.path.indexOf(folder) !== -1);
  }

  private getFileIndex(thePath: string): number {
    return this.preSaveFiles.findIndex(curFile => curFile.path === thePath);
  }
}
