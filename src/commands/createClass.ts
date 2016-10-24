import * as vscode from 'vscode';
import fs = require('fs-extra');
import {configuration} from './../services';

export default function createClass(context: vscode.ExtensionContext) {
    const slash: string = vscode.window.forceCode.pathSeparator;
    const classesPath: string = `${vscode.workspace.rootPath}${slash}src${slash}classes`;
    const CUSTOM_CLASS: string = 'Custom';
    return configuration().then(config => {
        return userClassSelection().then(selectedOption => {
            if (selectedOption) {
                return userFileNameSelection(selectedOption.label).then(filename => {
                    if (filename) {
                        generateFile(filename, config);
                    }
                });
            }
        });
    });

    function userClassSelection() {
        var classOptions: any = [
            {
                title: 'Repository',
                description: 'The Repository layer contains code responsible for querying records from the database.',
            }, {
                title: 'Controller',
                description: 'The Controller layer marshals data from the service to provide to the view.',
            }, {
                title: 'Model',
                description: 'Plain Old Class Objects used to normalize data from repositories.',
            }, {
                title: 'Service',
                description: 'The Service Layer contains business logic, calculations, and processes.',
            }, {
                title: CUSTOM_CLASS,
                description: 'Any custom class that does not fit standard conventions.',
            },
        ];
        let options: vscode.QuickPickItem[] = classOptions.map(res => {
            return {
                description: res.description,
                label: res.title,
            };
        });
        return vscode.window.showQuickPick(options);
    }

    function userFileNameSelection(classType) {
        // don't force name convention for custom class type.
        if (classType === CUSTOM_CLASS) {
            classType = '';
        }
        let options: vscode.InputBoxOptions = {
            placeHolder: 'Base name',
            prompt: `Enter ${classType} class name. ${classType}.cls will appended to this name`,
        };
        return vscode.window.showInputBox(options).then(classname => {
            if (classname) {
                if (classname.indexOf(' ') > -1) {
                    classname = classname.replace(' ', '');
                }
                if (classname.endsWith('.cls')) {
                    classname = classname.substring(0, classname.lastIndexOf('.cls'));
                }
                return classname + classType;
            }
            return undefined;
        });
    }

    function generateFile(classname, config) {
        // Write Class file
        var finalClassName: string = classesPath + slash + classname + '.cls';
        fs.stat(finalClassName, function (err, stats) {
            if (!err) {
                vscode.window.setStatusBarMessage('ForceCode: Error creating file');
                vscode.window.showErrorMessage('Cannot create ' + finalClassName + '. A file with that name already exists!');
            } else if (err.code === 'ENOENT') {
                var classFile: string = `public with sharing class ${classname} {

}`;
                fs.writeFile(finalClassName, classFile, function (writeErr) {
                    if (writeErr) {
                        vscode.window.setStatusBarMessage(writeErr.message);
                        vscode.window.showErrorMessage(writeErr.message);
                    } else {
                        vscode.window.setStatusBarMessage('ForceCode: ' + classname + ' was sucessfully created $(check)');
                    }
                });
            } else {
                vscode.window.setStatusBarMessage(err.code);
                vscode.window.showErrorMessage(err.code);
            }
        });
        // Write Metadata file
        var finalMetadataName: string = classesPath + slash + classname + '.cls-meta.xml';
        fs.stat(finalMetadataName, function (err, stats) {
            if (!err) {
                vscode.window.setStatusBarMessage('ForceCode: Error creating file');
                vscode.window.showErrorMessage('Cannot create ' + finalMetadataName + '. A file with that name already exists!');
            } else if (err.code === 'ENOENT') {

                var metaFile: string = `<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>${config.apiVersion || '37.0'}</apiVersion>
    <status>Active</status>
</ApexClass>`;

                fs.writeFile(finalMetadataName, metaFile, function (writeError) {
                    if (writeError) {
                        vscode.window.setStatusBarMessage(writeError.message);
                        vscode.window.showErrorMessage(writeError.message);
                    }
                });
            } else {
                vscode.window.setStatusBarMessage(err.code);
            }
        });
    }

}
