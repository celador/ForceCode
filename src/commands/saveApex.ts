import * as vscode from 'vscode';
import * as parsers from './../parsers';
import * as forceCode from './../forceCode';
import { saveService, codeCovViewService } from '../services';
import diff from './diff';
import { createPackageXML, deployFiles } from './deploy';
import * as path from 'path';

const UPDATE: boolean = true;

export function saveApex(
  document: vscode.TextDocument,
  toolingType: string,
  Metadata?: {},
  forceCompile?: boolean
): Promise<any> {
  const fileName: string = parsers.getFileName(document);
  const body: string = document.getText();
  const name: string = parsers.getName(document, toolingType);
  var checkCount: number = 0;
  return Promise.resolve(vscode.window.forceCode)
    .then(addToContainer)
    .then(requestCompile)
    .then(getCompileStatus);

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
          .then(records => addMember(records));
      });
    }

    function updateMember(records) {
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
      return fc.conn.tooling
        .sobject(parsers.getToolingType(document, UPDATE))
        .update(member)
        .then(() => {
          return fc;
        });
    }

    function shouldCompile(record) {
      const serverContents: string = record.Body ? record.Body : record.Markup;
      if (!forceCompile && !Metadata && !saveService.compareContents(document, serverContents)) {
        // throw up an alert
        return vscode.window
          .showWarningMessage('Someone else has changed this file!', 'Diff', 'Overwrite')
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
    function addMember(records) {
      if (records.length > 0) {
        // Tooling Object already exists
        //  UPDATE it
        var record = records[0];
        // Get the modified date of the local file...
        if (Metadata && Metadata['packageVersions']) {
          // this is an ApexPage...so we might need to edit packageVersions
          if (!Array.isArray(Metadata['packageVersions'])) {
            Metadata['packageVersions'] = [Metadata['packageVersions']];
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
          if (should) {
            return fc.conn.tooling
              .sobject(parsers.getToolingType(document, UPDATE))
              .create(member)
              .then(res => {
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
            const files: string[] = [];
            files.push(
              path.join(parsers.getFolder(toolingType), parsers.getWholeFileName(document))
            );
            if (Metadata) {
              // add the class/trigger/page/component
              const codeFileName: string = parsers.getWholeFileName(document).split('-meta.xml')[0];
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
            return deployFiles(files, vscode.window.forceCode.storageRoot).then(foo => {
              return fc.conn.tooling
                .sobject(toolingType)
                .find({ Name: fileName, NamespacePrefix: fc.config.prefix || '' })
                .execute()
                .then(records => {
                  if (records.length > 0) {
                    var workspaceMember: forceCode.IWorkspaceMember = {
                      name: fileName,
                      path: document.fileName,
                      id: records[0].Id,
                      type: toolingType,
                    };
                    codeCovViewService.addClass(workspaceMember);
                    return fc;
                  }
                });
            });
          }
        );
      }
    }
  }
  // =======================================================================================================================================
  function requestCompile() {
    if (vscode.window.forceCode.containerMembers.length === 0) {
      return undefined; // we don't need new container stuff on new file creation
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
  function getCompileStatus(): Promise<any> {
    if (vscode.window.forceCode.containerMembers.length === 0) {
      return Promise.resolve({}); // we don't need new container stuff on new file creation
    }
    return nextStatus();
    function nextStatus() {
      checkCount += 1;
      // Set a timeout to auto fail the compile after 60 seconds
      return getStatus().then(res => {
        if (isFinished(res)) {
          checkCount = 0;
          return res;
        } else if (checkCount > 30) {
          checkCount = 0;
          throw {
            message: fileName + ' timed out while saving. It might not be saved on the server.',
          };
        } else {
          // Throttle the ReCheck of the compile status, to use fewer http requests (reduce effects on SFDC limits)
          return new Promise(function(resolve) {
            setTimeout(() => resolve(), vscode.window.forceCode.config.poll || 2000);
          }).then(nextStatus);
        }
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
    function isFinished(res) {
      // Here, we're checking whether the Container Async Request, is Queued, or in some other state
      if (res.records && res.records[0]) {
        if (res.records.some(record => record.State === 'Queued')) {
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
