import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import {constants} from './../services';
import {IForceService} from './../forceCode';
import {getIcon} from './../parsers';
var service: IForceService;

export default function enterCredentials(context: vscode.ExtensionContext) {
    'use strict';
    vscode.window.setStatusBarMessage('ForceCode Menu');
    service = <IForceService>context.workspaceState.get(constants.FORCE_SERVICE);
    return getUsername()
        .then(cfg => getPassword(cfg))
        .then(cfg => getUrl(cfg))
        .then(cfg => getAutoCompile(cfg))
        // .then(cfg => setSettings(cfg)):
        .then(finished, onError);
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function getUsername() {
        let options: vscode.InputBoxOptions = {
            placeHolder: 'mark@salesforce.com',
            prompt: 'Please enter your SFDC username'
        };
        return vscode.window.showInputBox(options).then(function (result: string) {
            if (!result) { throw 'No Username'; };
            return { username: result };
        });
    }
    function getPassword(config) {
        let options: vscode.InputBoxOptions = {
            password: true,
            placeHolder: 'enter your password (and token)',
            prompt: 'Please enter your SFDC username'
        };
        return vscode.window.showInputBox(options).then(function (result: string) {
            if (!result) { throw 'No Password'; };
            config['password'] = result;
            return config;
        });
    }
    function getUrl(ret) {
        let options: vscode.QuickPickItem[] = [{
            icon: 'code',
            title: 'Production / Developer',
            url: 'https://login.salesforce.com',
        }, {
            icon: 'beaker',
            title: 'Sandbox / Test',
            url: 'https://test.salesforce.com',
        }].map(res => {
            let icon: string = getIcon(res.icon);
            return {
                description: `${res.url}`,
                // detail: `${'Detail'}`,
                label: `$(${icon}) ${res.title}`,
            };
        });
        return vscode.window.showQuickPick(options).then((res: vscode.QuickPickItem) => {
            ret['url'] = res.description || 'https://login.salesforce.com';
            return ret;
        });
    }
    function getAutoCompile(ret) {
        let options: vscode.QuickPickItem[] = [{
            description: 'Automatically deploy/compile files on save',
            label: 'Yes',
        }, {
                description: 'Deploy/compile code through the ForceCode menu',
                label: 'No',
            }];
        return vscode.window.showQuickPick(options).then((res: vscode.QuickPickItem) => {
            ret['autoCompile'] = res.label === 'Yes';
            return ret;
        });
    }
    // function setSettings(ret) {

    //     return vscode.window.showQuickPick(options).then( (res: vscode.QuickPickItem) => {
    //         ret['url'] = res.description;
    //         return ret;
    //     });
    // }
    // =======================================================================================================================================
    // =======================================================================================================================================
    // =======================================================================================================================================
    function finished(config) {
        console.log(config);
        return vscode.workspace.findFiles('.vscode/settings.json', '').then(function (files) {
            var filePath: string = files[0].path;
            var buffer: NodeBuffer = fs.readFileSync(filePath);
            var data: any = JSON.parse(buffer.toString());
            if (data.force) {
                data.force.username = config.username;
            } else {
                data.force = {};
                data.force.username = config.username;
            }
            fs.writeFile(path, data);
        });
    }
    // =======================================================================================================================================
    function onError(err): boolean {
        vscode.window.setStatusBarMessage('ForceCode: Error getting credentials');
        var outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('ForceCode');
        outputChannel.append('================================================================');
        outputChannel.append(err);
        console.log(err);
        return false;
    }
    // =======================================================================================================================================
}
