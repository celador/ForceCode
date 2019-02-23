import * as vscode from 'vscode';
import { toArray, dxService, PXML, PXMLMember } from '../services';
import { IMetadataObject } from '../forceCode';
import { SObjectDescribe, SObjectCategory } from '../dx';
import * as xml2js from 'xml2js';
import * as fs from 'fs-extra';

function sortFunc(a: any, b: any): number {
  var aStr = a.label.toUpperCase();
  var bStr = b.label.toUpperCase();
  return aStr.localeCompare(bStr);
}

export function getMembers(
  metadataTypes: string[],
  retrieveManaged?: boolean
): Promise<PXMLMember[]> {
  var metadataObjects: IMetadataObject[] = vscode.window.forceCode.describe.metadataObjects;
  if (!(metadataTypes.length === 1 && metadataTypes[0] === '*')) {
    metadataObjects = metadataObjects.filter(type => metadataTypes.includes(type.xmlName));
  }
  var proms: Promise<PXMLMember>[] = metadataObjects.map(r => {
    return new Promise<PXMLMember>((resolve, reject) => {
      if (r.xmlName === 'CustomObject') {
        new SObjectDescribe()
          .describeGlobal(SObjectCategory.ALL)
          .then(objs => {
            resolve({ name: r.xmlName, members: objs });
          })
          .catch(reject);
      } else if (r.inFolder) {
        const folderType = r.xmlName === 'EmailTemplate' ? 'EmailFolder' : `${r.xmlName}Folder`;
        vscode.window.forceCode.conn.metadata
          .list([{ type: folderType }])
          .then(folders => {
            let proms: Promise<any>[] = [];
            folders = toArray(folders);
            folders.forEach(f => {
              if (f && (f.manageableState === 'unmanaged' || retrieveManaged)) {
                proms.push(getFolderContents(r.xmlName, f.fullName));
              }
            });
            Promise.all(proms)
              .then(folderList => {
                folderList = toArray(folderList);
                var members = folders.filter(f => f !== undefined).map(f => f.fullName);
                members = [].concat(...members, ...folderList);
                resolve({ name: r.xmlName, members: members });
              })
              .catch(reject);
          })
          .catch(reject);
      } else if (r.xmlName === 'StandardValueSet') {
        // metadata list for StandardValueSet doesn't work. This is the workaround
        // IdeaCategory and QuestionOrigin can't be read or written to so we skip them in this list
        const sValSet: string[] = [
          'AccountContactMultiRoles',
          'AccountContactRole',
          'AccountOwnership',
          'AccountRating',
          'AccountType',
          'AssetStatus',
          'CampaignMemberStatus',
          'CampaignStatus',
          'CampaignType',
          'CaseContactRole',
          'CaseOrigin',
          'CasePriority',
          'CaseReason',
          'CaseStatus',
          'CaseType',
          'ContactRole',
          'ContractContactRole',
          'ContractStatus',
          'EntitlementType',
          'EventSubject',
          'EventType',
          'FiscalYearPeriodName',
          'FiscalYearPeriodPrefix',
          'FiscalYearQuarterName',
          'FiscalYearQuarterPrefix',
          'IdeaMultiCategory',
          'IdeaStatus',
          'IdeaThemeStatus',
          'Industry',
          'LeadSource',
          'LeadStatus',
          'OpportunityCompetitor',
          'OpportunityStage',
          'OpportunityType',
          'OrderType',
          'PartnerRole',
          'Product2Family',
          'QuickTextCategory',
          'QuickTextChannel',
          'QuoteStatus',
          'RoleInTerritory2',
          'SalesTeamRole',
          'Salutation',
          'ServiceContractApprovalStatus',
          'SocialPostClassification',
          'SocialPostEngagementLevel',
          'SocialPostReviewedStatus',
          'SolutionStatus',
          'TaskPriority',
          'TaskStatus',
          'TaskSubject',
          'TaskType',
          'WorkOrderLineItemStatus',
          'WorkOrderPriority',
          'WorkOrderStatus',
        ];

        resolve({ name: r.xmlName, members: sValSet });
      } else {
        resolve({ name: r.xmlName, members: ['*'] });
      }
    });
  });
  return Promise.all(proms);
}

export function getFolderContents(type: string, folder: string): Promise<string[]> {
  return vscode.window.forceCode.conn.metadata.list([{ type, folder }]).then(contents => {
    contents = toArray(contents);
    return contents.filter(f => f !== undefined).map(m => m.fullName);
  });
}

export default function packageBuilder(buildPackage?: boolean): Promise<any> {
  return new Promise((resolve, reject) => {
    var options: any[] = vscode.window.forceCode.describe.metadataObjects.map(r => {
      return {
        label: r.xmlName,
        detail: r.directoryName,
      };
    });
    options.sort(sortFunc);
    let config: {} = {
      matchOnDescription: true,
      matchOnDetail: true,
      placeHolder: 'Select types',
      canPickMany: true,
    };
    vscode.window.showQuickPick(options, config).then(types => {
      if (dxService.isEmptyUndOrNull(types)) {
        reject();
      }
      const typesArray: string[] = toArray(types).map(r => r.label);

      getMembers(typesArray)
        .then(mappedTypes => {
          if (!buildPackage) {
            resolve(mappedTypes);
          } else {
            // generate the file, then ask the user where to save it
            const builder = new xml2js.Builder();
            var packObj: PXML = {
              Package: {
                types: mappedTypes,
                version:
                  vscode.window.forceCode.config.apiVersion ||
                  vscode.workspace.getConfiguration('force')['defaultApiVersion'],
              },
            };
            var xml: string = builder
              .buildObject(packObj)
              .replace('<Package>', '<Package xmlns="http://soap.sforce.com/2006/04/metadata">')
              .replace(' standalone="yes"', '');
            const defaultURI: vscode.Uri = {
              scheme: 'file',
              path: vscode.window.forceCode.projectRoot.split('\\').join('/'),
              fsPath: vscode.window.forceCode.projectRoot,
              authority: undefined,
              query: undefined,
              fragment: undefined,
              with: undefined,
              toJSON: undefined,
            };
            vscode.window
              .showSaveDialog({ filters: { XML: ['xml'] }, defaultUri: defaultURI })
              .then(uri => {
                if (!uri) {
                  resolve();
                } else {
                  resolve(fs.outputFileSync(uri.fsPath, xml));
                }
              });
          }
        })
        .catch(reject);
    });
  });
}
