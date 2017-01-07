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



// Defines a Mocha test suite to group tests of similar kind together
suite('Extension Tests', () => {
    //   // Defines a Mocha unit test
    //   test('Something Should Fail', () => {
    //     assert.equal(2, 2);
    //   });

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

    // // I want a feature that allows me to... get intellisense for my Apex code
    //   test('I can get compeletion information for a Class name', () => {
    //       // Arrange
    //         // Get completion information from Salesforce

    //       // Act
    //         // Create completion popup when "." is clicked
    //       // Assert
    //         // Expect I get a popover with some comletion information
    //   });

    //   test('I can Save/Compile a Apex document', () => {
    //       // Arrange
    //         // Get document text
    //         const classText = 'public class Foobar {}';
    //         const textEditor = vscode.TextEditor()
    //         const vsCodeDocument: vscode.TextDocument = vscode.window.activeTextEditor.document;
    //       // Act
    //         // Attempt to compile the text on Salesforce
    //         var result = compile()
    //       // Assert
    //         // Assert the compile request was successful
    //   });

});


