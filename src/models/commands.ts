import { RetrieveBundle, RefreshContext, Refresh } from '../commands/retrieve';
import { CreateScratchOrg } from '../commands/createScratchOrg';
import { ForcecodeCommand, CancelCommand } from '../commands/forcecodeCommand';
import { Find } from '../commands/find';
import { Open, OpenContext, ShowFileOptions } from '../commands/open';
import { CreateClass } from '../commands/createClass';
import { ExecuteAnonymous, ExecuteAnonymousContext } from '../commands/executeAnonymous';
import { GetLog } from '../commands/getLog';
import { OverallCoverage } from '../commands/overallCoverage';
import { QueryEditor } from '../commands/queryEditor';
import { CodeCompletionRefresh } from '../commands/codeCompletionRefresh';
import { BulkLoader } from '../commands/bulkLoader';
import { Settings } from '../commands/settings';
import { ForceCodeMenu } from '../commands/menu';
import { ApexTest, RunTests, GetCodeCoverage, ToggleCoverage } from '../commands/apexTest';
import { DiffMenu, DiffContext } from '../commands/diff';
import { CompileMenu, CompileContext, ForceCompile } from '../commands/compile';
import {
  StaticResourceBundle,
  StaticResourceBundleContext,
  StaticResourceDeployFile,
} from '../commands/staticResource';
import { PackageBuilder } from '../commands/packageBuilder';
import { DeployPackage } from '../commands/deploy';
import { OpenOrg, PreviewVisualforce, PreviewApp, OpenFileInOrg } from '../commands/dxCommands';
import {
  ToolingQuery,
  CreateProject,
  Logout,
  SwitchUser,
  SwitchUserContext,
  FileModified,
  CheckForFileChanges,
  ShowTasks,
  OpenOnClick,
  Login,
  RemoveConfig,
} from '../commands/fcCommands';

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
  new StaticResourceBundleContext(),
  new CompileContext(),
  new DiffContext(),
  new ExecuteAnonymousContext(),
  new OpenContext(),
  new SwitchUserContext(),
  new RefreshContext(),
  new Refresh(),
  new ForceCodeMenu(),
  new ToggleCoverage(),
  new PreviewVisualforce(),
  new PreviewApp(),
  new OpenFileInOrg(),
  new ShowFileOptions(),
  new ApexTest(),
  new FileModified(),
  new StaticResourceDeployFile(),
  new CheckForFileChanges(),
  new ShowTasks(),
  new OpenOnClick(),
  new GetCodeCoverage(),
  new RunTests(),
  new Login(),
  new RemoveConfig(),
  new CancelCommand(),
];
