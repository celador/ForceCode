import { before } from 'mocha';
import { createForceJson } from '../testUtils/utils.test';

before(() => {
  createForceJson(process.env.SF_USERNAME || '');
});
