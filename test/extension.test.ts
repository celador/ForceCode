// 
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
// import compile from '../src/commands/compile';
import {ForceService} from './../src/services';
import {IForceService} from './../src/forceCode';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../src/extension';
import * as error from '../src/util/error';

const forceService: IForceService = vscode.window.forceCode = new ForceService();

suite('Extension Tests', () => {

    test('Shows an Error with Message', () => {
        // Arrange
        // Create an Error Message
        var errorMessage: string = 'A random error occurred';
        // Act
        // Show the error Message
        var result: boolean = error.outputError({message: errorMessage}, forceService.outputChannel);
        // Assert
        // Assert the error Message Showed up
        assert.equal(result, false);
    });

});


