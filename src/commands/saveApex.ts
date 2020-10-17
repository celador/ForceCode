import * as vscode from 'vscode';
import * as parsers from '../parsers';
import * as forceCode from '../forceCode';
import {
  saveService,
  codeCovViewService,
  notifications,
  containerService,
  Container,
} from '../services';
import { createPackageXML, deployFiles, FCCancellationToken } from '.';
import * as path from 'path';

export async function saveApex(
  document: vscode.TextDocument,
  toolingType: forceCode.IMetadataObject,
  cancellationToken: FCCancellationToken,
  Metadata?: any,
  forceCompile?: boolean
): Promise<any> {
  const fileName: string | undefined = parsers.getFileName(document);
  const body: string = document.getText();
  const name: string | undefined = parsers.getName(document, toolingType.xmlName);
  const upToolType: string = toolingType.xmlName + 'Member';
  let checkCount: number = 0;
  const container: Container = containerService.createContainer(
    document.fileName,
    fileName,
    toolingType.xmlName,
    upToolType
  );
  const containerResult = await addToContainer();
  const requestResult = await requestCompile(containerResult);
  return getCompileStatus(requestResult);

  // =======================================================================================================================================
  // =================================  Tooling Objects (Class, Page, Component, Trigger)  =================================================
  // =======================================================================================================================================
  async function addToContainer() {
    // We will push the filename on to the members array to make sure that the next time we compile,
    const records =
      container.records && container.records.length > 0 ? container.records[0] : container.records;
    if (cancellationToken.isCanceled()) {
      return Promise.reject();
    }
    if (container.existing && records && records.id) {
      // This is what happens when we had an error on the previous compile.
      // We want to just update the member and try to compile again
      let member: {} = Metadata
        ? {
            Body: body,
            Metadata: Metadata,
            Id: records.id,
          }
        : {
            Body: body,
            Id: records.id,
          };
      return container.updateContainerMember(member);
    } else {
      // Otherwise, we create a new Container
      const containerRecords = await container.createContainer();
      return addMember(containerRecords);
    }

    async function shouldCompile(record: any) {
      const serverContents: string = record.Body || record.Markup;
      if (
        !forceCompile &&
        !Metadata &&
        !saveService.compareContents(document.fileName, serverContents)
      ) {
        // throw up an alert
        const s = await notifications.showWarning(
          'Someone else has changed this file!',
          'Diff',
          'Overwrite'
        );
        if (s === 'Diff') {
          vscode.commands.executeCommand('ForceCode.diff', document.uri);
          containerService.removeContainer(container);
          return false;
        }
        if (s === 'Overwrite') {
          return true;
        }
        return false;
      } else {
        return Promise.resolve(true);
      }
    }

    async function addMember(records: any) {
      if (records && records.length > 0) {
        // Tooling Object already exists
        //  UPDATE it
        let record = records[0];
        // Get the modified date of the local file...
        if (Metadata?.packageVersions) {
          // this is an ApexPage...so we might need to edit packageVersions
          if (!Array.isArray(Metadata.packageVersions)) {
            Metadata.packageVersions = [Metadata.packageVersions];
          }
        }

        let member: {} = {
          Body: Metadata ? record.Body || record.Markup : body,
          ContentEntityId: record.Id,
          Id: container.containerId,
          Metadata: Metadata ? Object.assign({}, record.Metadata, Metadata) : record.Metadata,
          MetadataContainerId: container.containerId,
        };
        const should = await shouldCompile(record);
        if (cancellationToken.isCanceled()) {
          return Promise.reject();
        } else if (should && name) {
          return container.createContainerMember(member);
        } else {
          throw { message: record.Name + ' not saved' };
        }
      } else {
        // Results was 0, meaning...
        // Tooling Object does not exist
        // so we CREATE it
        await createPackageXML([document.fileName], vscode.window.forceCode.storageRoot);
        const wholeFileName = parsers.getWholeFileName(document);
        if (!wholeFileName || !fileName) {
          return Promise.reject('Error reading file information');
        }
        const files: string[] = [];
        files.push(path.join(toolingType.directoryName, wholeFileName));
        if (Metadata) {
          // add the class/trigger/page/component
          const codeFileName: string = wholeFileName.split('-meta.xml')[0];
          files.push(path.join(toolingType.directoryName, codeFileName));
        } else {
          // add the metadata
          files.push(
            path.join(toolingType.directoryName, parsers.getWholeFileName(document) + '-meta.xml')
          );
        }
        files.push('package.xml');
        const foo = await deployFiles(
          files,
          cancellationToken,
          vscode.window.forceCode.storageRoot
        );
        if (foo.status !== 'Failed') {
          const records = await vscode.window.forceCode.conn.tooling
            .sobject(toolingType.xmlName)
            .find({ Name: fileName, NamespacePrefix: vscode.window.forceCode.config.prefix || '' })
            .execute();
          if (records.length > 0) {
            let workspaceMember: forceCode.IWorkspaceMember = {
              name: fileName,
              path: document.fileName,
              id: records[0].Id,
              type: toolingType.xmlName,
              coverage: new Map<string, forceCode.ICodeCoverage>(),
            };
            codeCovViewService.addClass(workspaceMember);
          }
        }
        return Promise.resolve(foo);
      }
    }
  }
  // =======================================================================================================================================
  function requestCompile(retval: any) {
    if (!container.containerMember || cancellationToken.isCanceled()) {
      return Promise.resolve(retval);
    }
    return container.compile();
  }
  // =======================================================================================================================================
  function getCompileStatus(retval: any): Promise<any> {
    if (cancellationToken.isCanceled()) {
      return Promise.reject();
    }
    if (!container.containerMember) {
      return Promise.resolve(retval); // we don't need new container stuff on new file creation
    }
    return nextStatus();

    async function nextStatus(): Promise<any> {
      if (cancellationToken.isCanceled()) {
        return container
          .cancelCompile()
          .catch((_err) => Promise.reject())
          .then((_res) => Promise.reject());
      }
      checkCount += 1;
      // Set a timeout to auto fail the compile after 60 seconds
      const status = await container.getStatus();
      if (isFinished(status)) {
        checkCount = 0;
        containerService.removeContainer(container);
        return Promise.resolve(status);
      } else if (checkCount > 30) {
        checkCount = 0;
        const choice = await notifications.showError(
          'Timed out while requesting save status for ' +
            fileName +
            '. Continue checking for status updates?',
          'Yes',
          'No'
        );
        if (choice === 'N0') {
          cancellationToken.cancel();
          return container
            .cancelCompile()
            .catch((_err) => Promise.reject())
            .then((_res) => Promise.reject());
        }
      }

      // Throttle the ReCheck of the compile status, to use fewer http requests (reduce effects on SFDC limits)
      return new Promise(function (resolve) {
        setTimeout(() => resolve(), vscode.window.forceCode.config.poll || 2000);
      }).then(nextStatus);
    }

    function isFinished(res: any) {
      // Here, we're checking whether the Container Async Request, is Queued, or in some other state
      if (res?.records?.length > 0) {
        if (res.records.some((record: any) => record.State === 'Queued')) {
          return false;
        } else {
          // Completed, Failed, Invalidated, Error, Aborted
          return true;
        }
      }
      // If we don't have a container request, then we should stop.
      return true;
    }
  }
}
