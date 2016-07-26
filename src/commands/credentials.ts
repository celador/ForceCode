import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import {constants} from './../services';
import {getIcon} from './../parsers';

export default function enterCredentials(context: vscode.ExtensionContext) {
  'use strict';
  vscode.window.setStatusBarMessage('ForceCode Menu');
  var yoForceConfig = undefined;
  var keychain: any = require('xkeychain');

  return findFiles()
    .then(yoForce => getUsername(yoForce))
    .then(cfg => getPassword(cfg))
    .then(cfg => getUrl(cfg))
    .then(cfg => getAutoCompile(cfg))
    // .then(cfg => setSettings(cfg)):
    .then(finished, onError);
  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================
  function findFiles() {
    return Promise.resolve(getYoForceConfig);
  }
  function getYoForceConfig() {
    return vscode.workspace.findFiles('force.json', '').then(function (files) {
      var buffer: NodeBuffer = undefined;
      var forceConfig: any = {};
      if (files.length && files[0].path) {
        buffer = fs.readFileSync(files[0].path);
        try {
          forceConfig = JSON.parse(buffer.toString());
        } catch (error) {
          vscode.window.forceCode.outputChannel.appendLine('================================================================');
          vscode.window.forceCode.outputChannel.appendLine(error);
        }
        return new Promise((resolve, reject) => {
          try {
            keychain.getPassword({
              account: forceConfig.username,
              service: constants.FORCECODE_KEYCHAIN,
            }, function (err, pass) {
              if (err) {
                vscode.window.forceCode.outputChannel.appendLine('================================================================');
                vscode.window.forceCode.outputChannel.appendLine(err);
                reject(err);
              }
              forceConfig.password = pass;
              resolve(forceConfig);
            });
          } catch (error) {
            console.error(error);
            reject(error);
            vscode.window.forceCode.outputChannel.appendLine('================================================================');
            vscode.window.forceCode.outputChannel.appendLine(error);
          }
        });
      }
      return forceConfig;
    });
  }

  function getUsername(config) {
    yoForceConfig = config;
    let options: vscode.InputBoxOptions = {
      placeHolder: 'mark@salesforce.com',
      prompt: 'Please enter your SFDC username'
    };
    if (config.username) {
      options.value = config.username;
    }
    return vscode.window.showInputBox(options).then(function (result: string) {
      if (!result) { throw 'No Username'; };
      return { username: result };
    });
  }

  function getPassword(config) {
    let options: vscode.InputBoxOptions = {
      password: true,
      placeHolder: 'enter your password and token',
      prompt: 'Please enter your SFDC username'
    };
    if (yoForceConfig.password) {
      options.value = yoForceConfig.password;
    }
    return vscode.window.showInputBox(options).then(function (result: string) {
      if (!result) { throw 'No Password'; };
      try {
        keychain.setPassword({
          account: config.username,
          service: constants.FORCECODE_KEYCHAIN,
          password: result
        });
        config['password'] = result.split('').map(chr => '*').join('');
      } catch (error) {
        vscode.window.forceCode.outputChannel.appendLine('================================================================');
        vscode.window.forceCode.outputChannel.appendLine(error);
        config['password'] = result;
      }
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

  // =======================================================================================================================================
  // =======================================================================================================================================
  // =======================================================================================================================================
  function finished(config) {
    // console.log(config);
    return vscode.workspace.findFiles('.vscode/settings.json', '').then(function (files) {
      var filePath: string = '';
      var buffer: NodeBuffer = undefined;
      var data: any = {};
      if (files.length && files[0].path) {
        filePath = files[0].path;
        buffer = fs.readFileSync(filePath);
        try {
          data = JSON.parse(buffer.toString());
        } catch (error) {
          console.error(error);
        }
      }
      if (filePath.length === 0) {
        filePath = vscode.workspace.rootPath + '/.vscode/settings.json';
      }
      data = setForceConfig(data, config);
      fs.writeFile(filePath, JSON.stringify(data, undefined, 4));
      return config;
    });
  }
  function setForceConfig(data, config) {
    if (typeof (data.force) !== 'object') {
      data.force = {};
    }
    data.force.username = config.username;
    data.force.autoCompile = config.autoCompile;
    data.force.url = config.url;
    return data;
  }
  // =======================================================================================================================================
  function onError(err): boolean {
    vscode.window.setStatusBarMessage('ForceCode: Error getting credentials');
    var outputChannel: vscode.OutputChannel = vscode.window.forceCode.outputChannel;
    outputChannel.appendLine('================================================================');
    outputChannel.appendLine(err);
    console.error(err);
    return false;
  }
  // =======================================================================================================================================
}
