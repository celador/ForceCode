import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import {constants} from './../services';
import * as commands from './../commands';
var service: forceCode.IForceService;
var outputChannel: vscode.OutputChannel;
const jsforce = require('jsforce');

export default class ForceService implements forceCode.IForceService {
    public connect(context: vscode.ExtensionContext): PromiseLike<forceCode.IForceService> {
        'use strict';
        outputChannel = <vscode.OutputChannel>context.workspaceState.get(constants.OUTPUT_CHANNEL);
        if (service === undefined) {
            service = <forceCode.IForceService>context.workspaceState.get(constants.FORCE_SERVICE);
            if (service === {}) {
                context.workspaceState.update(constants.FORCE_SERVICE, new ForceService()).then(a => {
                    service = <forceCode.IForceService>context.workspaceState.get(constants.FORCE_SERVICE);
                });
            }
        }
        return this.setupConfig(context).then(this.login);
    }

    public setupConfig(context): PromiseLike<forceCode.IForceService> {
        const forceConfig: any = vscode.workspace.getConfiguration('force');
        const sfdcConfig: any = vscode.workspace.getConfiguration('sfdc');
        service.config = forceConfig;
        if (!forceConfig.username && sfdcConfig.username) {
            service.config = sfdcConfig;
        }
        if (!service.config.username || !service.config.password) {
            return commands.credentials(context).then(res => {
                service.config = vscode.workspace.getConfiguration('force');
                return service.config;
            });
        }
        return Promise.resolve(service.config);
    }
    public login(config): PromiseLike<forceCode.IForceService> {
        // Lazy-load the connection
        if (service.userInfo === undefined || service.config.username !== service.username) {
            service.conn = new jsforce.Connection({
                loginUrl: service.config.url || 'https://test.salesforce.com'
            });
            const username: string = service.config.username || '';
            const password: string = (service.config.password || '') + (service.config.token || '');
            if (!username || !password) { throw { message: 'No Credentials' }; }
            vscode.window.setStatusBarMessage(`ForceCode: $(plug) Connecting as ${username}`);
            return service.conn.login(username, password).then((userInfo) => {
                vscode.window.setStatusBarMessage(`ForceCode: $(zap) Connected $(zap)`);
                service.userInfo = userInfo;
                service['username'] = username;
                return service;
            }).catch(err => {
                vscode.window.setStatusBarMessage(`ForceCode: $(alert) Connection Error $(alert)`);
                outputChannel.appendLine(err.message);
                throw err;
            });
        } else {
            vscode.window.setStatusBarMessage(`ForceCode: $(history) Connected as ${service.config.username}`);
            return new Promise((resolve, reject) => {
                resolve(service);
            });
        }
    }


    public clearLog() {
        outputChannel.clear();
    };

    public newContainer(): PromiseLike<forceCode.IForceService> {
        'use strict';
        return service.conn.tooling.sobject('MetadataContainer')
            .create({ name: 'ForceCode-' + Date.now() })
            .then(res => {
                service.containerId = res.id;
                return service;
            });
    }

}
