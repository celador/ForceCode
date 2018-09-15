/* tslint:disable:no-unused-variable */
import ForceService from './forceService';
import * as operatingSystem from './operatingSystem';
import configuration from './configuration';

export {ForceService, operatingSystem, configuration};
import DXService from './dxService';
export const dxService = DXService.getInstance();
import { FCOauth, FCConnection } from './fcConnection';
import { FCConnectionService } from './fcConnectionService';
export const fcConnection = FCConnectionService.getInstance();
export { FCOauth, FCConnectionService, FCConnection };
import { CommandViewService } from './commandView';
export const commandViewService = CommandViewService.getInstance();
export { Task } from './commandView';
import { CommandService } from './commandService';
export const commandService = CommandService.getInstance();
import { CodeCovViewService } from './codeCovView';
export const codeCovViewService = CodeCovViewService.getInstance();
export * from './fcZip';