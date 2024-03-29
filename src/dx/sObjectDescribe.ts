/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { xhr, XHROptions, XHRResponse } from 'request-light';
import { FCOauth, fcConnection, notifications } from '../services';
import { getAPIVersion } from '../services/configuration';

const CLIENT_ID = 'sfdx-vscode';

export interface SObject {
  actionOverrides: any[];
  activateable: boolean;
  childRelationships: ChildRelationship[];
  compactLayoutable: boolean;
  createable: boolean;
  custom: boolean;
  customSetting: boolean;
  deletable: boolean;
  deprecatedAndHidden: boolean;
  feedEnabled: boolean;
  fields: Field[];
  hasSubtypes: boolean;
  isSubtype: boolean;
  keyPrefix: string;
  label: string;
  labelPlural: string;
  layoutable: boolean;
  listviewable?: any;
  lookupLayoutable?: any;
  mergeable: boolean;
  mruEnabled: boolean;
  name: string;
  namedLayoutInfos: any[];
  networkScopeFieldName?: any;
  queryable: boolean;
  recordTypeInfos: RecordTypeInfo[];
  replicateable: boolean;
  retrieveable: boolean;
  searchLayoutable: boolean;
  searchable: boolean;
  supportedScopes: SupportedScope[];
  triggerable: boolean;
  undeletable: boolean;
  updateable: boolean;
  urls: Urls2;
}

export interface ChildRelationship {
  cascadeDelete: boolean;
  childSObject: string;
  deprecatedAndHidden: boolean;
  field: string;
  junctionIdListNames: any[];
  junctionReferenceTo: any[];
  relationshipName: string;
  restrictedDelete: boolean;
}

export interface Field {
  aggregatable: boolean;
  autoNumber: boolean;
  byteLength: number;
  calculated: boolean;
  calculatedFormula?: any;
  cascadeDelete: boolean;
  caseSensitive: boolean;
  compoundFieldName?: any;
  controllerName?: any;
  createable: boolean;
  custom: boolean;
  defaultValue?: boolean;
  defaultValueFormula?: any;
  defaultedOnCreate: boolean;
  dependentPicklist: boolean;
  deprecatedAndHidden: boolean;
  digits: number;
  displayLocationInDecimal: boolean;
  encrypted: boolean;
  externalId: boolean;
  extraTypeInfo?: any;
  filterable: boolean;
  filteredLookupInfo?: any;
  groupable: boolean;
  highScaleNumber: boolean;
  htmlFormatted: boolean;
  idLookup: boolean;
  inlineHelpText?: any;
  label: string;
  length: number;
  mask?: any;
  maskType?: any;
  name: string;
  nameField: boolean;
  namePointing: boolean;
  nillable: boolean;
  permissionable: boolean;
  picklistValues: any[];
  polymorphicForeignKey: boolean;
  precision: number;
  queryByDistance: boolean;
  referenceTargetField?: any;
  referenceTo: string[];
  relationshipName: string;
  relationshipOrder?: any;
  restrictedDelete: boolean;
  restrictedPicklist: boolean;
  scale: number;
  searchPrefilterable: boolean;
  soapType: string;
  sortable: boolean;
  type: string;
  unique: boolean;
  updateable: boolean;
  writeRequiresMasterRead: boolean;
}

interface Urls {
  layout: string;
}

interface RecordTypeInfo {
  active: boolean;
  available: boolean;
  defaultRecordTypeMapping: boolean;
  master: boolean;
  name: string;
  recordTypeId: string;
  urls: Urls;
}

interface SupportedScope {
  label: string;
  name: string;
}

interface Urls2 {
  compactLayouts: string;
  rowTemplate: string;
  approvalLayouts: string;
  uiDetailTemplate: string;
  uiEditTemplate: string;
  defaultValues: string;
  describe: string;
  uiNewRecord: string;
  quickActions: string;
  layouts: string;
  sobject: string;
}

type SubRequest = { method: string; url: string };
type BatchRequest = { batchRequests: SubRequest[] };

type SubResponse = { statusCode: number; result: SObject };

type BatchResponse = { hasErrors: boolean; results: SubResponse[] };

export class SObjectDescribe {
  private readonly servicesPath: string = 'services/data';
  // the targetVersion should be consistent with the Cli even if only using REST calls
  private readonly versionPrefix = 'v';
  private readonly sobjectsPart: string = 'sobjects';
  private readonly batchPart: string = 'composite/batch';

  private getVersion(): string {
    return `${this.versionPrefix}${getAPIVersion()}`;
  }

  public async describeSObjectBatch(types: string[], nextToProcess: number): Promise<SObject[]> {
    const batchSize = 25;
    const batchRequest: BatchRequest = { batchRequests: [] };

    for (let i = nextToProcess; i < Math.min(nextToProcess + batchSize, types.length); i++) {
      notifications.writeLog('Processing description for ' + types[i]);
      const requestUrl = [this.getVersion(), this.sobjectsPart, types[i], 'describe'].join('/');

      batchRequest.batchRequests.push({ method: 'GET', url: requestUrl });
    }

    if (!fcConnection.currentConnection) {
      return Promise.reject('No current connection found');
    }

    const orgInfo: FCOauth = fcConnection.currentConnection.orgInfo;
    const batchRequestUrl = [
      orgInfo.instanceUrl,
      this.servicesPath,
      this.getVersion(),
      this.batchPart,
    ].join('/');

    const options: XHROptions = {
      type: 'POST',
      url: batchRequestUrl,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `OAuth ${orgInfo.accessToken}`,
        'User-Agent': 'salesforcedx-extension',
        'Sforce-Call-Options': `client=${CLIENT_ID}`,
      },
      data: JSON.stringify(batchRequest),
    };

    try {
      const response: XHRResponse = await xhr(options);
      const batchResponse = JSON.parse(response.responseText) as BatchResponse;
      const fetchedObjects: SObject[] = [];

      let i = nextToProcess;
      for (const sr of batchResponse.results) {
        if (sr.result instanceof Array && sr.result[0].errorCode && sr.result[0].message) {
          notifications.writeLog(`Error: ${sr.result[0].message} - ${types[i]}`);
        }
        i++;
        fetchedObjects.push(sr.result);
      }

      return Promise.resolve(fetchedObjects);
    } catch (error: any) {
      const xhrResponse: XHRResponse = error;
      return Promise.reject(xhrResponse.responseText);
    }
  }
}
