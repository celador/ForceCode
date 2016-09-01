'use strict';

import * as vscode from 'vscode';
import fs = require('fs-extra');
import * as path from 'path';
import {getIcon} from './../parsers';

export default function createClass(context: vscode.ExtensionContext) {

    const classesPath = `${vscode.workspace.rootPath}/src/classes`;
    getYoForceConfig().then(config => {
        if (config.enableSeperationOfConcerns || true) {
            userClassSelection().then(function(selectedOption) {
                generateFile(selectedOption, config);
            });
        } else {
            var selectedOption = {
                label: ''
            }
            generateFile(selectedOption, config);
        }
    });

    function generateFile(selectedOption, config) {
        userFileNameSelection(selectedOption.label).then(function(getFileName) {
            fs.stat(classesPath + '/' + getFileName + '.cls', function(err) {
                if (err == null) {
                    vscode.window.setStatusBarMessage('A file with this name already exists!');
                    vscode.window.showErrorMessage('A file with this name already exists!');
                } else if (err.code == 'ENOENT') {
                    var classFile = 'public class ' + getFileName + ' { \n';
                    classFile += '\n}';
                    fs.writeFile(classesPath + '/' + getFileName + '.cls', classFile, function(err) {
                        if (err) {
                            vscode.window.setStatusBarMessage(err.message);
                            vscode.window.showErrorMessage(err.message);
                        } else {
                            vscode.window.setStatusBarMessage(getFileName + ' was sucessfully created');
                        }
                    });
                } else {
                    vscode.window.setStatusBarMessage(err.code);
                    vscode.window.showErrorMessage(err.code);
                }
            });

            fs.stat(classesPath + '/' + getFileName + '.cls-meta.xml', function(err) {
                if (err == null) {
                    vscode.window.setStatusBarMessage('A file with this name already exists!');
                    vscode.window.showErrorMessage('A file with this name already exists!');
                } else if (err.code == 'ENOENT') {
                    var metaFile = '<?xml version="1.0" encoding="UTF-8"?>\n';
                    metaFile += '    <apiVersion>' + (config.apiVersion || '37.0') + '</apiVersion>\n';
                    metaFile += '    <status>Active</status>\n';
                    metaFile += '</ApexClass>';

                    fs.writeFile(classesPath + '/' + getFileName + '.cls-meta.xml', metaFile, function(err) {
                        if (err) {
                            vscode.window.setStatusBarMessage(err.message);
                            vscode.window.showErrorMessage(err.message);
                        }
                    });
                } else {
                    vscode.window.setStatusBarMessage(err.code);
                }    
            });
        });
    }
    
    function getYoForceConfig() {
        var forceConfig: any = {};
        try {
            forceConfig = fs.readJsonSync(vscode.workspace.rootPath + '/force.json');
        } catch (err) {
        }
        return Promise.resolve(forceConfig);
    }
    function userClassSelection() {
        let options: vscode.QuickPickItem[] = [{
            icon: 'code',
            title: 'Selector',
            description: 'Selector layer contains code responsible for querying records from the database.'
        }, {
            icon: 'code',
            title: 'Domain',
            description: 'Called into by the Service contains the execution logic of business tasks, calculations, and processes.'
        }, {
            icon: 'code',
            title: 'Service',
            description: 'A Service Layer contains code implementation of business tasks, calculations, and processes.'
        }].map(res => {
            let icon: string = getIcon(res.icon);
            return {
            description: `${res.description}`,
            label: `${res.title}`,
            };
        });
        return vscode.window.showQuickPick(options).then((res: vscode.QuickPickItem) => {
            return res;
        });
    }

    function userFileNameSelection(classType) {
        let options: vscode.InputBoxOptions = {
            placeHolder: 'Foo' + classType + '.cls',
            prompt: 'Enter ' + classType + ' class name.'
        };
        return vscode.window.showInputBox(options).then(function (result: string) {
            var definedErrors = {
                error: false,
                message: ''
            }
            if (result.length < 1) {
                definedErrors.message += 'Enter a filename';
            }
            if (result.indexOf(' ') > -1) {
                if (definedErrors.error) {
                    definedErrors.message += '\n'
                }
                definedErrors.message += 'No spaces in a file name';
            }
            if (result.indexOf('.cls') > -1) {
                if (definedErrors.error) {
                    definedErrors.message += '\n'
                }
                definedErrors.message += 'No need to append .cls we will do that for you';
            }

            if (result.indexOf(classType) > -1) {
                if (definedErrors.error) {
                    definedErrors.message += '\n'
                }
                definedErrors.message += 'No need to append class type we will do that for you';
            }

            if (definedErrors.error) {
                vscode.window.setStatusBarMessage(definedErrors.message);
                vscode.window.showErrorMessage(definedErrors.message);
            }
            return result;
        });
    }
}