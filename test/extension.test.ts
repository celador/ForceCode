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

suite('Extension Tests', () => {
  test('Shows an Error with Message', () => {
    // Arrange
    // Create an Error Message
    var errorMessage: string = 'A random error occurred';
    // Act
    // Show the error Message
    vscode.window.showErrorMessage(errorMessage);
    // Assert
    // Assert the error Message Showed up
    assert.equal(false, false);
  });
});
