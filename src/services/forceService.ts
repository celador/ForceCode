import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import {constants} from './../services';
import * as commands from './../commands';
const keychain: any = require('xkeychain');
const jsforce = require('jsforce');

export default class ForceService implements forceCode.IForceService {
    public config: forceCode.Config;
    public conn: any;
    public containerId: string;
    public containerAsyncRequestId: string;
    public userInfo: any;
    public username: string;
    public outputChannel: vscode.OutputChannel;

    constructor(context) {
        // Set the ForceCode configuration
        const forceConfig: any = vscode.workspace.getConfiguration('force');
        const sfdcConfig: any = vscode.workspace.getConfiguration('sfdc');
        this.config = forceConfig;
        if (!forceConfig.username && sfdcConfig.username) {
            this.config = sfdcConfig;
        }
        // Setup username and outputChannel
        this.username = this.config.username || '';
        this.outputChannel = vscode.window.createOutputChannel(constants.OUTPUT_CHANNEL_NAME);
        this.conn = new jsforce.Connection({
            loginUrl: this.config.url || 'https://test.salesforce.com'
        });
    }
    public connect(context: vscode.ExtensionContext): Promise<forceCode.IForceService> {
        return this.setupConfig(context).then(config => this.login(config));
    }

    public clearLog() {
        this.outputChannel.clear();
    };

    public newContainer(): Promise<forceCode.IForceService> {
        'use strict';
        var self: forceCode.IForceService = vscode.window.forceCode;
        return self.conn.tooling.sobject('MetadataContainer')
            .create({ name: 'ForceCode-' + Date.now() })
            .then(res => {
                self.containerId = res.id;
                return self;
            });
    }

    private setupConfig(context): Promise<forceCode.IForceService> {
        var self: forceCode.IForceService = vscode.window.forceCode;
        // Set the ForceCode configuration
        const forceConfig: any = vscode.workspace.getConfiguration('force');
        const sfdcConfig: any = vscode.workspace.getConfiguration('sfdc');
        self.config = forceConfig;
        if (!forceConfig.username && sfdcConfig.username) {
            self.config = sfdcConfig;
        }
        // Setup username and outputChannel
        self.username = self.config.username || '';
        if (!self.config.username) {
            return commands.credentials(context).then(credentials => {
                self.config.username = credentials.username;
                self.config.autoCompile = credentials.autoCompile;
                self.config.url = credentials.url;
                return self.config;
            });
        }
        return Promise.resolve(self.config);
    }
    private login(config): Promise<forceCode.IForceService> {
        var self: forceCode.IForceService = vscode.window.forceCode;
        // Lazy-load the connection
        if (self.userInfo === undefined || self.config.username !== self.username || self.conn.accessToken === undefined) {
            self.conn = new jsforce.Connection({
                loginUrl: self.config.url || 'https://test.salesforce.com'
            });
            var username: string = self.config.username || '';
            var password: string = '';
            return new Promise((resolve, reject) => {
                try {
                    keychain.getPassword({
                        account: config.username,
                        service: constants.FORCECODE_KEYCHAIN,
                    }, function (err, pass) {
                        if (err) {
                            console.error(err.message);
                            throw err;
                        } else {
                            password = pass;
                            actuallyLogin().then(resolve);
                        }
                    });
                } catch (error) {
                    console.error(error);
                    throw error;
                }
            });

            function actuallyLogin() {
                if (!username || !password) {
                    vscode.window.setStatusBarMessage(`ForceCode: $(alert) Missing Credentials $(alert)`);
                    throw { message: 'No Credentials' };
                }
                vscode.window.setStatusBarMessage(`ForceCode: $(plug) Connecting as ${username}`);
                return self.conn.login(username, password).then((userInfo) => {
                    vscode.window.setStatusBarMessage(`ForceCode: $(zap) Connected $(zap)`);
                    self.outputChannel.appendLine(`Connected as username. ${JSON.stringify(userInfo)}`);
                    self.userInfo = userInfo;
                    self.username = username;
                    return self;
                }).catch(err => {
                    vscode.window.setStatusBarMessage(`ForceCode: $(alert) Connection Error $(alert)`);
                    self.outputChannel.appendLine('================================================================');
                    self.outputChannel.appendLine(err.message);
                    throw err;
                });
            };
        } else {
            vscode.window.setStatusBarMessage(`ForceCode: $(history) Connected as ${self.config.username}`);
            return Promise.resolve(self);
        }
    }
}
