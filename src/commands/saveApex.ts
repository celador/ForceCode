import * as vscode from 'vscode';
import * as parsers from './../parsers';
import * as forceCode from './../forceCode';
import { saveService, codeCovViewService, notifications } from '../services';
import diff from './diff';
import { createPackageXML, deployFiles } from './deploy';
import * as path from 'path';
import { FCCancellationToken } from './forcecodeCommand';

const UPDATE: boolean = true;

export function saveApex(
  document: vscode.TextDocument,
  toolingType: string,
  cancellationToken: FCCancellationToken,
  Metadata?: any,
  forceCompile?: boolean
): Promise<any> {
  const fileName: string | undefined = parsers.getFileName(document);
  const body: string = document.getText();
  const name: string | undefined = parsers.getName(document, toolingType);
  var checkCount: number = 0;
  return Promise.resolve(vscode.window.forceCode)
    .then(addToContainer)
    .then(requestCompile)
    .then(asyncRequest => getCompileStatus(asyncRequest));

  // =======================================================================================================================================
  // =================================  Tooling Objects (Class, Page, Component, Trigger)  =================================================
  // =======================================================================================================================================
  function addToContainer(svc: forceCode.IForceService) {
    // We will push the filename on to the members array to make sure that the next time we compile,
    var fc: forceCode.IForceService = vscode.window.forceCode;
    var hasActiveContainer: Boolean = svc.containerId !== undefined;
    var fileIsOnlyMember: Boolean =
      fc.containerMembers.length === 1 && fc.containerMembers.every(m => m.name === name);
    if (hasActiveContainer && fileIsOnlyMember) {
      // This is what happens when we had an error on the previous compile.
      // We want to just update the member and try to compile again
      return updateMember(fc.containerMembers[0]);
    } else {
      // Otherwise, we create a new Container
      return svc.newContainer(true).then(() => {
        // Then Get the files info from the type, name, and prefix
        // Then Add the new member, updating the contents.
        return fc.conn.tooling
          .sobject(toolingType)
          .find({ Name: fileName, NamespacePrefix: fc.config.prefix || '' })
          .execute()
          .then((records: any) => addMember(records));
      });
    }

    function updateMember(records: any) {
      var member: {} = Metadata
        ? {
            Body: records.body,
            Metadata: Metadata,
            Id: records.id,
          }
        : {
            Body: body,
            Id: records.id,
          };
      const upToolType = parsers.getToolingType(document, UPDATE);
      if (cancellationToken.isCanceled()) {
        return Promise.reject();
      } else if (upToolType) {
        return fc.conn.tooling
          .sobject(upToolType)
          .update(member)
          .then(() => {
            return fc;
          });
      } else {
        return Promise.reject({ message: 'Unknown metadata type' });
      }
    }

    function shouldCompile(record: any) {
      const serverContents: string = record.Body ? record.Body : record.Markup;
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
              diff(document);
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
      if (records.length > 0) {
        // Tooling Object already exists
        //  UPDATE it
        var record = records[0];
        // Get the modified date of the local file...
        if (Metadata && Metadata.packageVersions) {
          // this is an ApexPage...so we might need to edit packageVersions
          if (!Array.isArray(Metadata.packageVersions)) {
            Metadata.packageVersions = [Metadata.packageVersions];
          }
        }

        var member: {} = {
          Body: Metadata ? (record.Body ? record.Body : record.Markup) : body,
          ContentEntityId: record.Id,
          Id: fc.containerId,
          Metadata: Metadata ? Object.assign({}, record.Metadata, Metadata) : record.Metadata,
          MetadataContainerId: fc.containerId,
        };
        return shouldCompile(record).then(should => {
          const upToolType = parsers.getToolingType(document, UPDATE);
          if (cancellationToken.isCanceled()) {
            return Promise.reject();
          } else if (should && upToolType && name) {
            return fc.conn.tooling
              .sobject(upToolType)
              .create(member)
              .then(res => {
                if (!res.id) {
                  throw { message: record.Name + ' not saved' };
                }
                fc.containerMembers.push({ name, id: res.id });
                return fc;
              });
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
            files.push(path.join(parsers.getFolder(toolingType), wholeFileName));
            if (Metadata) {
              // add the class/trigger/page/component
              const codeFileName: string = wholeFileName.split('-meta.xml')[0];
              files.push(path.join(parsers.getFolder(toolingType), codeFileName));
            } else {
              // add the metadata
              files.push(
                path.join(
                  parsers.getFolder(toolingType),
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
                return fc.conn.tooling
                  .sobject(toolingType)
                  .find({ Name: fileName, NamespacePrefix: fc.config.prefix || '' })
                  .execute()
                  .then((records: any) => {
                    if (records.length > 0) {
                      var workspaceMember: forceCode.IWorkspaceMember = {
                        name: fileName,
                        path: document.fileName,
                        id: records[0].Id,
                        type: toolingType,
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
    if (vscode.window.forceCode.containerMembers.length === 0 || cancellationToken.isCanceled()) {
      return {
        async then(callback: any) {
          return callback(retval);
        },
      };
    }
    return vscode.window.forceCode.conn.tooling
      .sobject('ContainerAsyncRequest')
      .create({
        IsCheckOnly: false,
        IsRunTests: false,
        MetadataContainerId: vscode.window.forceCode.containerId,
      })
      .then(res => {
        vscode.window.forceCode.containerAsyncRequestId = res.id;
        return vscode.window.forceCode;
      });
  }
  // =======================================================================================================================================
  function getCompileStatus(retval: any): Promise<any> {
    if (cancellationToken.isCanceled()) {
      return Promise.reject();
    }
    if (vscode.window.forceCode.containerMembers.length === 0) {
      return Promise.resolve(retval); // we don't need new container stuff on new file creation
    }
    return nextStatus();
    function nextStatus(): any {
      if (cancellationToken.isCanceled()) {
        return cancelRequest()
          .catch(err => Promise.reject())
          .then(res => Promise.reject());
      }
      checkCount += 1;
      // Set a timeout to auto fail the compile after 60 seconds
      return getStatus().then(res => {
        if (isFinished(res)) {
          checkCount = 0;
          return res;
        } else if (checkCount > 30) {
          checkCount = 0;
          return notifications
            .showError(fileName + ' timed out while saving. Cancel save?', 'Yes', 'No')
            .then(choice => {
              if (choice === 'No') {
                return new Promise(function(resolve) {
                  setTimeout(() => resolve(), vscode.window.forceCode.config.poll || 2000);
                }).then(nextStatus);
              } else {
                cancellationToken.cancel();
                return cancelRequest()
                  .catch(err => Promise.reject())
                  .then(res => Promise.reject());
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
    function cancelRequest(): Promise<any> {
      return vscode.window.forceCode.conn.tooling
        .sobject('ContainerAsyncRequest')
        .update({ Id: vscode.window.forceCode.containerAsyncRequestId, State: 'Aborted' })
        .then(res => {
          return res;
        });
    }
    function getStatus(): Promise<any> {
      return vscode.window.forceCode.conn.tooling.query(
        `SELECT Id, MetadataContainerId, MetadataContainerMemberId, State, IsCheckOnly, ` +
          `DeployDetails, ErrorMsg FROM ContainerAsyncRequest WHERE Id='${
            vscode.window.forceCode.containerAsyncRequestId
          }'`
      );
    }
    function isFinished(res: any) {
      // Here, we're checking whether the Container Async Request, is Queued, or in some other state
      if (res.records && res.records[0]) {
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
