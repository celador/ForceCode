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

export function saveApex(
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
  var checkCount: number = 0;
  const container: Container = containerService.createContainer(
    document.fileName,
    fileName,
    toolingType.xmlName,
    upToolType
  );
  return Promise.resolve(vscode.window.forceCode)
    .then(addToContainer)
    .then(requestCompile)
    .then(getCompileStatus);

  // =======================================================================================================================================
  // =================================  Tooling Objects (Class, Page, Component, Trigger)  =================================================
  // =======================================================================================================================================
  function addToContainer(svc: forceCode.IForceService) {
    // We will push the filename on to the members array to make sure that the next time we compile,
    var records = container.records;
    if (container.existing && records?.length > 0) {
      // This is what happens when we had an error on the previous compile.
      // We want to just update the member and try to compile again
      if (!records || cancellationToken.isCanceled()) {
        return Promise.reject();
      }
      records = records && records.length > 0 ? records[0] : records;
      var member: {} = Metadata
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
      return container.createContainer().then(addMember);
    }

    function shouldCompile(record: any) {
      const serverContents: string = record.Body || record.Markup;
      if (
        !forceCompile &&
        !Metadata &&
        !saveService.compareContents(document.fileName, serverContents)
      ) {
        // throw up an alert
        return notifications
          .showWarning('Someone else has changed this file!', 'Diff', 'Overwrite')
          .then(s => {
            if (s === 'Diff') {
              vscode.commands.executeCommand('ForceCode.diff', document);
              return false;
            }
            if (s === 'Overwrite') {
              return true;
            }
            return false;
          });
      } else {
        return Promise.resolve(true);
      }
    }
    function addMember(records: any) {
      if (records && records.length > 0) {
        // Tooling Object already exists
        //  UPDATE it
        var record = records[0];
        // Get the modified date of the local file...
        if (Metadata?.packageVersions) {
          // this is an ApexPage...so we might need to edit packageVersions
          if (!Array.isArray(Metadata.packageVersions)) {
            Metadata.packageVersions = [Metadata.packageVersions];
          }
        }

        var member: {} = {
          Body: Metadata ? record.Body || record.Markup : body,
          ContentEntityId: record.Id,
          Id: container.containerId,
          Metadata: Metadata ? Object.assign({}, record.Metadata, Metadata) : record.Metadata,
          MetadataContainerId: container.containerId,
        };
        return shouldCompile(record).then(should => {
          if (cancellationToken.isCanceled()) {
            return Promise.reject();
          } else if (should && name) {
            return container.createContainerMember(member);
          } else {
            throw { message: record.Name + ' not saved' };
          }
        });
      } else {
        // Results was 0, meaning...
        // Tooling Object does not exist
        // so we CREATE it
        return createPackageXML([document.fileName], vscode.window.forceCode.storageRoot).then(
          () => {
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
                path.join(
                  toolingType.directoryName,
                  parsers.getWholeFileName(document) + '-meta.xml'
                )
              );
            }
            files.push('package.xml');
            return deployFiles(files, cancellationToken, vscode.window.forceCode.storageRoot).then(
              foo => {
                if (foo.status === 'Failed') {
                  return foo;
                }
                return svc.conn.tooling
                  .sobject(toolingType.xmlName)
                  .find({ Name: fileName, NamespacePrefix: svc.config.prefix || '' })
                  .execute()
                  .then((records: any) => {
                    if (records.length > 0) {
                      var workspaceMember: forceCode.IWorkspaceMember = {
                        name: fileName,
                        path: document.fileName,
                        id: records[0].Id,
                        type: toolingType.xmlName,
                        coverage: new Map<string, forceCode.ICodeCoverage>(),
                      };
                      codeCovViewService.addClass(workspaceMember);
                      return foo;
                    }
                  });
              }
            );
          }
        );
      }
    }
  }
  // =======================================================================================================================================
  function requestCompile(retval: any) {
    if (!container.containerMember || cancellationToken.isCanceled()) {
      return {
        async then(callback: any) {
          return callback(retval);
        },
      };
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
    function nextStatus(): any {
      if (cancellationToken.isCanceled()) {
        return container
          .cancelCompile()
          .catch(_err => Promise.reject())
          .then(_res => Promise.reject());
      }
      checkCount += 1;
      // Set a timeout to auto fail the compile after 60 seconds
      return container.getStatus().then(res => {
        if (isFinished(res)) {
          checkCount = 0;
          containerService.removeContainer(container);
          return res;
        } else if (checkCount > 30) {
          checkCount = 0;
          return notifications
            .showError(
              'Timed out while requesting save status for ' +
                fileName +
                '. Continue checking for status updates?',
              'Yes',
              'No'
            )
            .then(choice => {
              if (choice === 'Yes') {
                return new Promise(function(resolve) {
                  setTimeout(() => resolve(), vscode.window.forceCode.config.poll || 2000);
                }).then(nextStatus);
              } else {
                cancellationToken.cancel();
                return container
                  .cancelCompile()
                  .catch(_err => Promise.reject())
                  .then(_res => Promise.reject());
              }
            });
        } else {
          // Throttle the ReCheck of the compile status, to use fewer http requests (reduce effects on SFDC limits)
          return new Promise(function(resolve) {
            setTimeout(() => resolve(), vscode.window.forceCode.config.poll || 2000);
          }).then(nextStatus);
        }
      });
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
