import { ForcecodeCommand, CancelCommand, FCCancellationToken } from './forcecodeCommand';
export { getApexTestResults } from '../services';
import { compile, CompileMenu, ForceCompile } from './compile';
import { DeployPackage, createPackageXML, deployFiles } from './deploy';
import { DiffMenu } from './diff';
import { Open, ShowFileOptions } from './open';
import { packageBuilder, PackageBuilder, getMembers, getFolderContents } from './packageBuilder';
import { retrieve, RetrieveBundle, Refresh, ToolingType, getAnyNameFromUri } from './retrieve';
import { getAuraDefTypeFromDocument, saveAura } from './saveAura';
import { saveApex } from './saveApex';
import { saveLWC } from './saveLWC';
import { StaticResourceBundle, staticResourceDeployFromFile } from './staticResource';
import { CreateScratchOrg } from './createScratchOrg';

import { Find } from './find';
import { CreateClass } from './createClass';
import { ExecuteAnonymous } from './executeAnonymous';
import { GetLog } from './getLog';
import { OverallCoverage } from './overallCoverage';
import { QueryEditor } from './queryEditor';
import { CodeCompletionRefresh } from './codeCompletionRefresh';
import { BulkLoader } from './bulkLoader';
import { Settings } from './settings';
import { ForceCodeMenu } from './menu';
import { ApexTest, RunTests, GetCodeCoverage, ToggleCoverage } from './apexTest';
import { OpenOrg, PreviewVisualforce, PreviewApp, OpenFileInOrg } from './dxCommands';
import { createProject } from './createProject';
import {
  ToolingQuery,
  CreateProject,
  Logout,
  SwitchUser,
  FileModified,
  CheckForFileChanges,
  OpenOnClick,
  Login,
  RemoveConfig,
  ChangeCoverageDecoration,
  DeleteFile,
} from './fcCommands';

export {
  compile,
  packageBuilder,
  retrieve,
  saveApex,
  saveAura,
  saveLWC,
  staticResourceDeployFromFile,
  ForcecodeCommand,
  createProject,
  FCCancellationToken,
  getAuraDefTypeFromDocument,
  RetrieveBundle,
  getMembers,
  getFolderContents,
  createPackageXML,
  deployFiles,
  ToolingType,
  getAnyNameFromUri,
};

export const fcCommands: ForcecodeCommand[] = [
  // Start visible menu items
  new OpenOrg(),
  new Find(),
  new Open(),
  new CreateClass(),
  new ExecuteAnonymous(),
  new GetLog(),
  new OverallCoverage(),
  new QueryEditor(),
  new CreateScratchOrg(),
  new DiffMenu(),
  new CompileMenu(),
  new StaticResourceBundle(),
  new PackageBuilder(),
  new RetrieveBundle(),
  new DeployPackage(),
  new CodeCompletionRefresh(),
  new BulkLoader(),
  new Settings(),
  new CreateProject(),
  new Logout(),
  new SwitchUser(),
  // End visible menu items
  new ToolingQuery(),
  new ForceCompile(),
  new Refresh(),
  new ForceCodeMenu(),
  new ToggleCoverage(),
  new PreviewVisualforce(),
  new PreviewApp(),
  new OpenFileInOrg(),
  new ShowFileOptions(),
  new ApexTest(),
  new FileModified(),
  new CheckForFileChanges(),
  new OpenOnClick(),
  new ChangeCoverageDecoration(),
  new GetCodeCoverage(),
  new RunTests(),
  new Login(),
  new RemoveConfig(),
  new CancelCommand(),
  new DeleteFile(),
];
