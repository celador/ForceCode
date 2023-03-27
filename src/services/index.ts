export { /*isLinux, isMac,*/ isWindows, getHomeDir /*getOS*/ } from './operatingSystem';
export { OUTPUT_CHANNEL_NAME, MAX_TIME_BETWEEN_FILE_CHANGES, GA_TRACKING_ID } from './constants';
export { getApexTestResults } from './apexTestResults';
import { Notifications } from './notifications';
export const notifications = Notifications.getInstance();
export { ForceService } from './forceService';
export { checkConfig, enterCredentials } from './credentials';
export {
  getSetConfig,
  defaultOptions,
  saveConfigFile,
  readConfigFile,
  removeConfigFolder,
  readForceJson,
  getVSCodeSetting,
} from './configuration';

import { DXService } from './dxService';
export const dxService = DXService.getInstance();
export { SObjectCategory, ApexTestQueryResult, ExecuteAnonymousResult, SFDX } from './dxService';
export { FCOauth, FCConnection } from './fcConnection';
import { FCConnectionService } from './fcConnectionService';
export const fcConnection = FCConnectionService.getInstance();
export { FCConnectionService };
import { CommandViewService } from './commandView';
export const commandViewService = CommandViewService.getInstance();
export { Task } from './commandView';
import { CodeCovViewService, FCFile, ClassType } from './codeCovView';
export const codeCovViewService = CodeCovViewService.getInstance();
export { FCFile, ClassType };
import { SaveService } from './saveService';
export const saveService = SaveService.getInstance();
import { SaveHistoryService, SaveResult } from './saveHistoryService';
export const saveHistoryService = SaveHistoryService.getInstance();
import { ContainerService, Container } from './containerService';
export const containerService = ContainerService.getInstance();
export { Container, SaveResult };
export * from './fcZip';
