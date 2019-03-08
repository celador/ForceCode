import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { compile } from '../commands';

interface PreSaveFile {
  path: string;
  fileContents: string;
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
  public addFile(document: vscode.TextDocument): boolean {
    const thePath = document.fileName;
    const existingFile: PreSaveFile = this.getFile(thePath);

    if (existingFile) {
      return false;
    } else {
      const fileContents: string = fs
        .readFileSync(thePath)
        .toString()
        .trim();
      this.preSaveFiles.push({ path: thePath, fileContents: fileContents });
      return true;
    }
  }

  public compareContents(document: vscode.TextDocument, serverContents: string): boolean {
    serverContents = serverContents.trim();
    const oldFileContents: PreSaveFile = this.getFile(document.fileName);

    if (oldFileContents) {
      return oldFileContents.fileContents === serverContents;
    }
    // no data to compare to
    return false;
  }

  public saveFile(document: vscode.TextDocument, forceCompile: boolean): Promise<boolean> {
    // take the path and get the TextDocument, then hand it off to the compile() function
    return new Promise((resolve, reject) => {
      compile(document, forceCompile).then(success => {
        if (success) {
          // update the file time for start up file change checks
          var mTime: Date = new Date();
          fs.utimesSync(document.fileName, mTime, mTime);
          // remove the pre-save file version if successful
          return resolve(this.removeFile(document.fileName));
        }
        return resolve(false);
      });
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

  private getFile(thePath: string): PreSaveFile {
    const fileIndex: number = this.getFileIndex(thePath);
    if (fileIndex > -1) {
      return this.preSaveFiles[fileIndex];
    } else {
      return undefined;
    }
  }

  private getFileIndex(thePath: string): number {
    return this.preSaveFiles.findIndex(curFile => curFile.path === thePath);
  }
}
