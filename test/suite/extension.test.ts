//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
// import compile from '../src/commands/compile';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../src/extension';

import * as sinon from 'sinon';
import { dxService } from '../../src/services';
import { FCCancellationToken } from '../../src/commands/forcecodeCommand';
import sfdxRetValsTest from './sfdxRetVals.test';
import mock = require('mock-fs');

suite('Extension Tests', () => {
  var theStub = sinon
    .stub(dxService as any, 'runCommand')
    .callsFake(function(
      cmdString: string,
      targetusername: boolean,
      cancellationToken?: FCCancellationToken
    ): Promise<any> {
      var command = cmdString.split('force:').pop();
      command = command ? command.split(' ').shift() : undefined;
      return Promise.resolve(command ? sfdxRetValsTest[command] : undefined);
    });
  mock({
    'force.json': `{ lastUsername: ${sfdxRetValsTest['org:display'].username} }`,
  });
  test('Activates the extension', () => {
    // test extension load
    vscode.commands.executeCommand('ForceCode.showMenu').then(res => {
      console.log('Activated');
      console.log(res);
      assert.strictEqual(true, true);
    });
  });
  mock.restore();
  theStub.restore();
});
