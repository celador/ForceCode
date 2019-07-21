import { after } from 'mocha';
import { removeProjectFiles } from '../testUtils/utils.test';

after(() => {
  removeProjectFiles();
});
