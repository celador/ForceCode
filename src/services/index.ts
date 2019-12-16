export { isLinux, isMac, isWindows, getHomeDir, getOS } from './operatingSystem';
import { Notifications } from './notifications';
export const notifications = Notifications.getInstance();
export { inDebug, trackEvent, FCTimer, getUUID, FCAnalytics } from './fcAnalytics';
import ForceService from './forceService';
import configuration from './configuration';
export { checkConfig, enterCredentials } from './credentials';
export {
  defaultOptions,
  saveConfigFile,
  readConfigFile,
  removeConfigFolder,
  readForceJson,
} from './configuration';

export { ForceService, configuration };
import DXService from './dxService';
export const dxService = DXService.getInstance();
import { SObjectCategory, ApexTestQueryResult } from './dxService';
import { ExecuteAnonymousResult, SFDX } from './dxService';
export { SObjectCategory, ApexTestQueryResult, ExecuteAnonymousResult, SFDX };
import { FCOauth, FCConnection } from './fcConnection';
import { FCConnectionService } from './fcConnectionService';
export const fcConnection = FCConnectionService.getInstance();
export { FCOauth, FCConnectionService, FCConnection };
import { CommandViewService } from './commandView';
export const commandViewService = CommandViewService.getInstance();
export { Task } from './commandView';
import { CodeCovViewService, FCFile, ClassType } from './codeCovView';
export const codeCovViewService = CodeCovViewService.getInstance();
export { FCFile, ClassType };
import { SaveService } from './saveService';
export const saveService = SaveService.getInstance();
import { SaveHistoryService } from './saveHistoryService';
export const saveHistoryService = SaveHistoryService.getInstance();
import apexTestResults from './apexTestResults';
export { apexTestResults };
export * from './fcZip';
