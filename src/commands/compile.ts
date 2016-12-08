import * as vscode from 'vscode';
import * as parsers from './../parsers';
import sleep from './../util/sleep';
import { IForceService } from './../forceCode';
import * as error from './../util/error';
const parseString: any = require('xml2js').parseString;

var elegantSpinner: any = require('elegant-spinner');
const UPDATE: boolean = true;
const CREATE: boolean = false;

interface ContainerAsyncRequest {
  done: boolean;
  size: Number;
  totalSize: Number;
  records?: any[];
  errors?: any[];
  State?: string;
}

export default function compile(document: vscode.TextDocument, context: vscode.ExtensionContext): Promise<any> {
  const body: string = document.getText();
  const ext: string = parsers.getFileExtension(document);
  const toolingType: string = parsers.getToolingType(document);
  const fileName: string = parsers.getFileName(document);
  const name: string = parsers.getName(document, toolingType);
  const spinner: any = elegantSpinner();
  var checkCount: number = 0;
  var interval: any = undefined;

  /* tslint:disable */
  var DefType: string = undefined;
  var Format: string = undefined;
  var Source: string = undefined;
  var currentObjectDefinition: any = undefined;
  var AuraDefinitionBundleId: string = undefined;
  var Id: string = undefined;
  /* tslint:enable */
  // Start doing stuff
  vscode.window.forceCode.statusBarItem.text = `ForceCode: ${name} ${DefType ? DefType : ''}` + spinner();
  if (toolingType === undefined) {
    return Promise
      .reject({ message: 'Unknown Tooling Type.  Ensure the body is well formed' })
      .catch(onError);
  } else if (toolingType === 'AuraDefinition') {
    DefType = getAuraDefTypeFromDocument(document);
    Format = getAuraFormatFromDocument(document);
    Source = document.getText();
    // Aura Bundles are a special case, since they can be upserted with the Tooling API
    // Instead of needing to be compiled, like Classes and Pages..
    return vscode.window.forceCode.connect(context)
      .then(svc => getAuraBundle(svc)
        .then(ensureAuraBundle)
        .then(bundle => getAuraDefinition(svc, bundle)
          .then(definitions => upsertAuraDefinition(definitions, bundle)
          )
        )
      ).then(finished, onError);
  } else if (toolingType === 'PermissionSet' || toolingType === 'CustomObject' || toolingType === 'CustomLabels') {
    Source = document.getText();
    // This process uses the Metadata API to deploy specific files
    // This is where we extend it to create any kind of metadata
    // Currently only Objects and Permission sets ...
    return vscode.window.forceCode.connect(context)
      .then(createMetaData)
      .then(finished, onError);
  } else {
    // This process uses the Tooling API to compile special files like Classes, Triggers, Pages, and Components
    // vscode.window.forceCode.statusBarItem.text = `ForceCode: ${name} ${DefType ? DefType : ''}` + spinner();
    if (vscode.window.forceCode.isCompiling) {
      return Promise.reject({ message: 'Already compiling' });
    }
    clearInterval(interval);
    interval = setInterval(function () {
      if (checkCount <= 10) {
        vscode.window.forceCode.statusBarItem.color = 'white';
      }
      if (checkCount > 10) {
        vscode.window.forceCode.statusBarItem.color = 'orange';
      }
      if (checkCount > 20) {
        vscode.window.forceCode.statusBarItem.color = 'red';
      }
      vscode.window.forceCode.statusBarItem.text = `ForceCode: ${name} ${DefType ? DefType : ''}` + spinner();
    }, 50);


    // So first, we need to get the current metadata container Id
    // When ForceCode boots, we create a metadata Container for our workspace... the same way we currently are.
    // We persist that Id on our 
    // We then get the members that are part of the container

    // Currently, we always create a new member... 
    // Create or update the container member
    // Request a compile
    // We then poll for the success

    // We then get the members that are part of the container


    vscode.window.forceCode.isCompiling = true;
    return vscode.window.forceCode.connect(context)
      .then(addToContainer)
      .then(requestCompile)
      .then(getCompileStatus)
      .then(finished, onError)
      .then(containerFinished);
  }

  // =======================================================================================================================================
  // ================================                  All Metadata                  ===========================================
  // =======================================================================================================================================

  function createMetaData(svc) {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Create Metadata';
    return new Promise(function (resolve, reject) {
      parseString(Source, { explicitArray: false, async: true }, function (err, result) {
        if (err) {
          reject(err);
        }
        var metadata: any = result[toolingType];
        delete metadata['$'];
        metadata.fullName = fileName;
        resolve(compileMetadata(metadata));
      });
    });
  }

  function compileMetadata(metadata) {
    vscode.window.forceCode.statusBarItem.text = 'ForceCode: Deploying...';
    return vscode.window.forceCode.conn.metadata.upsert(toolingType, [metadata]).then(
      function (result) {
        if (result.success) {
          vscode.window.forceCode.statusBarItem.text = 'ForceCode: Successly deployed ' + result.fullName;
          return result;
        } else {
          var error: any = result.errors[0];
          throw { message: error };
        }
      }
    );
  }

  // =======================================================================================================================================
  // ================================                Lightning Components               ===========================================
  // =======================================================================================================================================
  function getAuraBundle(svc) {
    return vscode.window.forceCode.conn.tooling.sobject('AuraDefinitionBundle').find({
      'DeveloperName': name, NamespacePrefix: vscode.window.forceCode.config.prefix || ''
    });
  }
  function ensureAuraBundle(results) {
    // If the Bundle doesn't exist, create it, else Do nothing
    if (!results[0] || results[0].length === 0) {
      // Create Aura Definition Bundle
      return vscode.window.forceCode.conn.tooling.sobject('AuraDefinitionBundle').create({
        'DeveloperName': name,
        'MasterLabel': name,
        'ApiVersion': vscode.window.forceCode.config.apiVersion || '37.0',
        'Description': name.replace('_', ' '),
      }).then(bundle => {
        results[0] = [bundle];
        return results;
      });
    } else {
      return results;
    }
  }
  function getAuraDefinition(svc, bundle) {
    return vscode.window.forceCode.conn.tooling.sobject('AuraDefinition').find({
      'AuraDefinitionBundleId': bundle[0].Id
    });
  }
  function upsertAuraDefinition(definitions, bundle) {
    // If the Definition doesn't exist, create it
    var def: any[] = definitions.filter(result => result.DefType === DefType);
    currentObjectDefinition = def.length > 0 ? def[0] : undefined;
    if (currentObjectDefinition !== undefined) {
      AuraDefinitionBundleId = currentObjectDefinition.AuraDefinitionBundleId;
      Id = currentObjectDefinition.Id;
      return vscode.window.forceCode.conn.tooling.sobject('AuraDefinition').update({ Id: currentObjectDefinition.Id, Source });
    } else if (bundle[0]) {
      return vscode.window.forceCode.conn.tooling.sobject('AuraDefinition').create({ AuraDefinitionBundleId: bundle[0].Id, DefType, Format, Source });
    }
  }
  function getAuraDefTypeFromDocument(doc: vscode.TextDocument) {
    var extension: string = ext.toLowerCase();
    switch (extension) {
      case 'app':
        // APPLICATION — Lightning Components app
        return 'APPLICATION';
      case 'cmp':
        // COMPONENT — component markup
        return 'COMPONENT';
      case 'auradoc':
        // DOCUMENTATION — documentation markup
        return 'DOCUMENTATION';
      case 'css':
        // STYLE — style (CSS) resource
        return 'STYLE';
      case 'evt':
        // EVENT — event definition
        return 'EVENT';
      case 'design':
        // DESIGN — design definition
        return 'DESIGN';
      case 'svg':
        // SVG — SVG graphic resource
        return 'SVG';
      case 'js':
        var fileNameEndsWith: string = fileName.replace(name, '').toLowerCase();
        if (fileNameEndsWith === 'controller') {
          // CONTROLLER — client-side controller
          return 'CONTROLLER';
        } else if (fileNameEndsWith === 'helper') {
          // HELPER — client-side helper
          return 'HELPER';
        } else if (fileNameEndsWith === 'renderer') {
          // RENDERER — client-side renderer
          return 'RENDERER';
        };
        break;
      default:
        throw `Unknown extension: ${extension} .`;
    }
    // Yet to be implemented
    // INTERFACE — interface definition
    // TOKENS — tokens collection
    // PROVIDER — reserved for future use
    // TESTSUITE — reserved for future use
    // MODEL — deprecated, do not use
  }
  function getAuraFormatFromDocument(doc: vscode.TextDocument) {
    // is 'js', 'css', or 'xml'
    switch (ext) {
      case 'js':
        return 'js';
      case 'css':
        return 'css';
      default:
        return 'xml';
    }
  }
  // =======================================================================================================================================
  // =================================  Tooling Objects (Class, Page, Component, Trigger)  =================================================
  // =======================================================================================================================================

  function addToContainer(svc: IForceService) {
    // We will push the filename on to the members array to make sure that the next time we compile, 
    var hasActiveContainer: Boolean = svc.containerId !== undefined;
    var fileIsOnlyMember: Boolean = (vscode.window.forceCode.containerMembers.length === 1) && vscode.window.forceCode.containerMembers.every(m => m.name === name);
    if (hasActiveContainer && fileIsOnlyMember) {
      return updateMember(vscode.window.forceCode.containerMembers[0]);
      // return svc.newContainer(false).then(() => {
      //   return vscode.window.forceCode.conn.tooling.sobject(parsers.getToolingType(document, UPDATE))
      //     .find({ MetadataContainerId: vscode.window.forceCode.containerId }).execute()
      //     .then(records => updateMember(records));
      // });
    } else {
      return svc.newContainer(true).then(() => {
        return vscode.window.forceCode.conn.tooling.sobject(toolingType)
          .find({ Name: fileName, NamespacePrefix: vscode.window.forceCode.config.prefix || '' }).execute()
          .then(records => addMember(records));
      });
    }



    function updateMember(records) {
      // if (records.length === 1) {
        // Tooling Object already exists
        //  UPDATE it
        // records[0].Body = body;
        // var record: any = records[0];
        var member: {} = {
          Body: body,
          Id: records.id
        };
        return vscode.window.forceCode.conn.tooling.sobject(parsers.getToolingType(document, UPDATE)).update(member).then(res => {
          return vscode.window.forceCode;
        });
      // }
    }

    function addMember(records) {
      if (records.length === 1) {
        // Tooling Object already exists
        //  UPDATE it
        var record: { Id: string, Metadata: {} } = records[0];
        var member: {} = {
          Body: body,
          ContentEntityId: record.Id,
          Id: vscode.window.forceCode.containerId,
          Metadata: record.Metadata,
          MetadataContainerId: vscode.window.forceCode.containerId,
        };
        return vscode.window.forceCode.conn.tooling.sobject(parsers.getToolingType(document, UPDATE)).create(member).then(res => {
          vscode.window.forceCode.containerMembers.push({ name, id: res.id });
          return vscode.window.forceCode;
        });
      } else {
        // Tooling Object does not exist
        // CREATE it
        vscode.window.forceCode.statusBarItem.text = 'ForceCode: Creating ' + name;
        return vscode.window.forceCode.conn.tooling.sobject(parsers.getToolingType(document, CREATE)).create(createObject(body)).then(foo => {
          return vscode.window.forceCode;
        });
      }
    }
    function createObject(text: string): {} {
      if (toolingType === 'ApexClass' || toolingType === 'ApexTrigger') {
        return { Body: text };
      } else if (toolingType === 'ApexPage' || toolingType === 'ApexComponent') {
        return {
          Markup: text,
          Masterlabel: name + 'Label',
          Name: name,
        };
      }
      return { Body: text };
    }
  }
  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================
  function requestCompile() {
    return vscode.window.forceCode.conn.tooling.sobject('ContainerAsyncRequest').create({
      IsCheckOnly: false,
      IsRunTests: false,
      MetadataContainerId: vscode.window.forceCode.containerId,
    }).then(res => {
      vscode.window.forceCode.containerAsyncRequestId = res.id;
      return vscode.window.forceCode;
    });
  }
  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================
  function getCompileStatus(): Promise<any> {
    vscode.window.forceCode.statusBarItem.text = `ForceCode: ${name} ${DefType ? DefType : ''}` + spinner();
    return nextStatus();
    function nextStatus() {
      checkCount += 1;
      // vscode.window.forceCode.statusBarItem.text = 'ForceCode: Get Status...' + checkCount;
      // Set a timeout to auto fail the compile after 30 seconds
      return getStatus().then(res => {
        if (isFinished(res)) {
          checkCount = 0;
          clearInterval(interval);
          return res;
        } else if (checkCount > 30) {
          checkCount = 0;
          clearInterval(interval);
          throw { message: 'Timeout' };
        } else {
          // Throttle the ReCheck of the compile status, to use fewer http requests (reduce effects on SFDC limits)
          return sleep(vscode.window.forceCode.config.poll || 1000).then(nextStatus);
        }
      });
    }
    function getStatus(): Promise<ContainerAsyncRequest> {
      return vscode.window.forceCode.conn.tooling.query(`SELECT Id, MetadataContainerId, MetadataContainerMemberId, State, IsCheckOnly, ` +
        `DeployDetails, ErrorMsg FROM ContainerAsyncRequest WHERE Id='${vscode.window.forceCode.containerAsyncRequestId}'`);
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
  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================
  function finished(res: any): boolean {
    // Create a diagnostic Collection for the current file.  Overwriting the last...
    var diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(document.fileName);
    var diagnostics: vscode.Diagnostic[] = [];
    if (res.records && res.records.length > 0) {
      res.records.filter(r => r.State !== 'Error').forEach(containerAsyncRequest => {
        containerAsyncRequest.DeployDetails.componentFailures.forEach(failure => {
          // Create Red squiggly lines under the errors that came back
          if (failure.problemType === 'Error') {
            var failureLineNumber: number = Math.abs(failure.lineNumber || failure.LineNumber || 1);
            var failureRange: vscode.Range = document.lineAt(failureLineNumber - 1).range;
            if (failure.columnNumber > 0) {
              failureRange = failureRange.with(new vscode.Position((failureLineNumber - 1), failure.columnNumber));
            }
            diagnostics.push(new vscode.Diagnostic(failureRange, failure.problem, failure.problemType));
          }
        });
      });
    } else if (res.errors && res.errors.length > 0) {
      // We got an error with the container
      res.errors.forEach(err => {
        console.error(err);
      });
      vscode.window.forceCode.statusBarItem.text = `ForceCode: ${name} ${DefType ? DefType : ''} $(alert)`;
    } else if (res.State === 'Error') {
      vscode.window.forceCode.statusBarItem.text = `ForceCode: ${name} ${DefType ? DefType : ''} $(alert)`;
    }
    // TODO: Make the Success message derive from the componentSuccesses, maybe similar to above code for failures
    diagnosticCollection.set(document.uri, diagnostics);
    if (diagnostics.length > 0) {
      // FAILURE !!! We have to assume we are only compiling one thing at a time.
      //  if that's not the file we're compiling, we will make a new container
      vscode.window.forceCode.statusBarItem.text = `ForceCode: ${name} ${DefType ? DefType : ''} $(alert)`;
      return false;
    } else {
      // SUCCESS !!! 
      vscode.window.forceCode.statusBarItem.text = `ForceCode: ${name} ${DefType ? DefType : ''} $(check)`;
      return true;
    }
  }

  function containerFinished(createNewContainer: boolean): any {
    // We got some records in our response
    vscode.window.forceCode.isCompiling = false;
    return vscode.window.forceCode.newContainer(createNewContainer);
  }
  // =======================================================================================================================================
  function onError(err): any {
    if (toolingType === 'AuraDefinition') {
      return toolingError(err);
    } else if (toolingType === 'CustomObject') {
      return metadataError(err);
    } else {
      error.outputError(err, vscode.window.forceCode.outputChannel);
    }
  }

  function toolingError(err) {
    var diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(document.fileName);
    var diagnostics: vscode.Diagnostic[] = [];
    var splitString: string[] = err.message.split(fileName + ':');
    var partTwo: string = splitString.length > 1 ? splitString[1] : '1,1:Unknown error';
    var idx: number = partTwo.indexOf(':');
    var rangeArray: any[] = partTwo.substring(0, idx).split(',');
    var errorMessage: string = partTwo.substring(idx);
    var statusIdx: string = 'Message: ';
    var statusMessage: string = partTwo.substring(partTwo.indexOf(statusIdx) + statusIdx.length);
    var failureLineNumber: number = rangeArray[0];
    var failureColumnNumber: number = rangeArray[1];
    var failureRange: vscode.Range = document.lineAt(failureLineNumber - 1).range;
    if (failureColumnNumber > 0) {
      failureRange = failureRange.with(new vscode.Position((failureLineNumber - 1), failureColumnNumber));
    }
    diagnostics.push(new vscode.Diagnostic(failureRange, errorMessage, 0));
    diagnosticCollection.set(document.uri, diagnostics);

    error.outputError({ message: statusMessage }, vscode.window.forceCode.outputChannel);
    return false;
  }
  function metadataError(err) {
    var diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection(document.fileName);
    var diagnostics: vscode.Diagnostic[] = [];
    var errorInfo: string[] = err.message.split('\n');
    var line: number = Number(errorInfo[1].split('Line: ')[1]);
    var col: number = Number(errorInfo[2].split('Column: ')[1]);
    var failureRange: vscode.Range = document.lineAt(line).range;
    if (col > 0) {
      failureRange = failureRange.with(new vscode.Position((line), col));
    }
    diagnostics.push(new vscode.Diagnostic(failureRange, errorInfo[0] + errorInfo[3], 0));
    diagnosticCollection.set(document.uri, diagnostics);

    error.outputError(err, vscode.window.forceCode.outputChannel);
    return false;

  }

  // =======================================================================================================================================
}
