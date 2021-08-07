import * as fs from 'fs-extra';
import { compile, FCCancellationToken, staticResourceDeployFromFile } from '../commands';
import klaw = require('klaw');
import { notifications } from '.';
import { IMetadataObject } from '../forceCode';
import { getAnyTTMetadataFromPath } from '../parsers';
import { getSrcDir } from './configuration';

interface PreSaveFile {
  path: string;
  fileContents: string;
  saving: boolean;
  queue: boolean;
}

export class SaveService {
  private static instance: SaveService;
  private preSaveFiles: Map<string, PreSaveFile>;

  constructor() {
    this.preSaveFiles = new Map<string, PreSaveFile>();
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
  public addFile(documentPath: string): PreSaveFile {
    const existingFile: PreSaveFile | undefined = this.getFile(documentPath);

    if (existingFile) {
      return existingFile;
    } else {
      // we need to read the file since the document has unsaved content
      const fileContents: string = fs.readFileSync(documentPath).toString().trim();
      const newPSFile: PreSaveFile = {
        path: documentPath,
        fileContents: fileContents,
        saving: false,
        queue: false,
      };
      this.preSaveFiles.set(newPSFile.path, newPSFile);
      return newPSFile;
    }
  }

  public addFilesInFolder(folder: string): Promise<boolean> {
    const self: SaveService = this;
    return new Promise<boolean>((resolve, reject) => {
      klaw(folder)
        .on('data', (file) => {
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
      psFilesToRemove.forEach((f) => this.removeFile(f.path));
      return true;
    } else {
      return false;
    }
  }

  public compareContents(documentPath: string, serverContents: string): boolean {
    // workaround for SF always saving VF pages with <apex:page > instead or <apex:page>
    if (serverContents.startsWith('<apex:page >')) {
      serverContents = serverContents.replace('<apex:page >', '<apex:page>');
    }
    const oldFileContents: PreSaveFile | undefined = this.getFile(documentPath);
    if (oldFileContents) {
      return oldFileContents.fileContents.trim() === serverContents.trim();
    }
    // no data to compare to
    return true;
  }

  public saveFile(
    document: string,
    forceCompile: boolean,
    cancellationToken: FCCancellationToken
  ): Promise<boolean> {
    // if the preSaveFile doesn't exist, make it. this means someone is saving via ctr+shift+s or right click and hasn't changed the file+saved it
    if (!fs.existsSync(document)) {
      throw "This type of document can't be saved via the ForceCode menu. Please right-click the file in the explorer and click ForceCode: Save/Deploy/Compile";
    }

    const psFile: PreSaveFile = this.addFile(document);
    if (psFile.saving) {
      psFile.queue = true;
      this.updateFile(psFile);
      return Promise.resolve(true);
    }
    psFile.saving = true;
    this.updateFile(psFile);
    const self: SaveService = this;

    return new Promise<boolean>((resolve, reject) => {
      return startSave()
        .then((success: any) => {
          psFile.saving = false;
          self.updateFile(psFile);
          if (success) {
            // update the file time for start up file change checks
            let mTime: Date = new Date();
            fs.utimesSync(document, mTime, mTime);
            // remove the pre-save file version if successful
            if (psFile.queue) {
              psFile.queue = false;
              self.updateFile(psFile);
              return resolve(self.saveFile(document, true, cancellationToken));
            } else {
              return resolve(self.removeFile(document));
            }
          } else {
            return resolve(false);
          }
        })
        .catch((reason: any) => {
          psFile.saving = false;
          self.updateFile(psFile);
          return reject(reason);
        });
    });

    function startSave() {
      let isResource: RegExpMatchArray | null = document.match(/resource\-bundles.*\.resource.*$/); // We are in a resource-bundles folder, bundle and deploy the staticResource
      const toolingType: IMetadataObject | undefined = getAnyTTMetadataFromPath(document);
      if (document.indexOf(getSrcDir()) !== -1) {
        if (isResource?.index) {
          return staticResourceDeployFromFile(document);
        } else if (toolingType) {
          return compile(document, forceCompile, cancellationToken);
        }
      } else if (isResource || toolingType) {
        notifications.showError(
          "The file you are trying to save to the server isn't in the current org's source folder (" +
            getSrcDir() +
            ')'
        );
      }
      return Promise.resolve(false);
    }
  }

  private updateFile(psFile: PreSaveFile) {
    this.preSaveFiles.set(psFile.path, psFile);
  }

  private removeFile(thePath: string): boolean {
    return this.preSaveFiles.delete(thePath);
  }

  private getFile(thePath: string): PreSaveFile | undefined {
    return this.preSaveFiles.get(thePath);
  }

  private getFilesInFolder(folder: string): PreSaveFile[] {
    return Array.from(this.preSaveFiles.values()).filter(
      (psFile) => psFile.path.indexOf(folder) !== -1
    );
  }
}
