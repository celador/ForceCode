import apexTestResults from '../services/apexTestResults';
import compile from './compile';
import deploy from './deploy';
import diff from './diff';
import { showFileOptions } from './open';
import packageBuilder from './packageBuilder';
import retrieve from './retrieve';
import staticResource from './staticResource';
import { staticResourceDeployFromFile } from './staticResource';

export {
  apexTestResults,
  compile,
  deploy,
  diff,
  packageBuilder,
  retrieve,
  showFileOptions,
  staticResource,
  staticResourceDeployFromFile,
};
