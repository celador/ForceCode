import { Notifications } from './notifications';
export const notifications = Notifications.getInstance();

import * as operatingSystem from './operatingSystem';
import ForceService from './forceService';
import configuration from './configuration';
export { defaultOptions, saveConfigFile } from './configuration';

export { ForceService, operatingSystem, configuration };
import DXService from './dxService';
export const dxService = DXService.getInstance();
import { SObjectCategory, ApexTestQueryResult, ExecuteAnonymousResult, SFDX } from './dxService';
export { SObjectCategory, ApexTestQueryResult, ExecuteAnonymousResult, SFDX };
import { FCOauth, FCConnection } from './fcConnection';
import { FCConnectionService } from './fcConnectionService';
export const fcConnection = FCConnectionService.getInstance();
export { FCOauth, FCConnectionService, FCConnection };
import { CommandViewService } from './commandView';
export const commandViewService = CommandViewService.getInstance();
export { Task } from './commandView';
import { CodeCovViewService } from './codeCovView';
export const codeCovViewService = CodeCovViewService.getInstance();
import { SaveService } from './saveService';
export const saveService = SaveService.getInstance();
import { SaveHistoryService } from './saveHistoryService';
export const saveHistoryService = SaveHistoryService.getInstance();
import apexTestResults from './apexTestResults';
export { apexTestResults };
export * from './fcZip';
