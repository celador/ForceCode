import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import * as path from 'path';
// import * as fs from 'fs-extra';
import { constants, operatingSystem } from './../services';
import { configuration } from './../services';
import * as commands from './../commands';
const jsforce: any = require('jsforce');
const pjson : any  = require('./../../../package.json');

export default class ForceService implements forceCode.IForceService {
    public config: forceCode.Config;
    public conn: any;
    public containerId: string;
    public containerMembers: any[];
    public containerAsyncRequestId: string;
    public userInfo: any;
    public username: string;
    public statusBarItem: vscode.StatusBarItem;
    public outputChannel: vscode.OutputChannel;
    public operatingSystem: string;

    constructor() {
        // Set the ForceCode configuration
        this.operatingSystem = operatingSystem.getOS();
        // Setup username and outputChannel
        this.outputChannel = vscode.window.createOutputChannel(constants.OUTPUT_CHANNEL_NAME);
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 5);
        this.statusBarItem.command = 'ForceCode.showMenu';
        this.statusBarItem.tooltip = 'Open the ForceCode Menu';
        this.statusBarItem.text = 'ForceCode: Active';
        this.containerMembers = [];
        configuration(this).then(config => {
            this.username = config.username || '';
            this.conn = new jsforce.Connection({
                loginUrl: config.url || 'https://login.salesforce.com'
            });
            this.statusBarItem.text = `ForceCode ${pjson.version} is Active`;
        }).catch(err => {
            this.statusBarItem.text = 'ForceCode: Missing Configuration';
        });
        this.statusBarItem.show();
    }
    public connect(): Promise<forceCode.IForceService> {
        return this.setupConfig().then(this.login);
    }

    public clearLog() {
        this.outputChannel.clear();
    };

    public newContainer(force: Boolean): Promise<forceCode.IForceService> {
        var self: forceCode.IForceService = vscode.window.forceCode;
        if (self.containerId && !force) {
          return Promise.resolve(self);
        } else {
          return self.conn.tooling.sobject('MetadataContainer')
              .create({ name: 'ForceCode-' + Date.now() })
              .then(res => {
                  self.containerId = res.id;
                  self.containerMembers = [];
                  return self;
              });
        }
    }

    // TODO: Add keychain access so we don't have to use a username or password'
    // var keychain = require('keytar')
    private setupConfig(): Promise<forceCode.IForceService> {
        var self: forceCode.IForceService = vscode.window.forceCode;
        // Setup username and outputChannel
        self.username = (self.config && self.config.username) || '';
        if (!self.config || !self.config.username) {
            return commands.credentials().then(credentials => {
                self.config.username = credentials.username;
                self.config.password = credentials.password;
                self.config.autoCompile = credentials.autoCompile;
                self.config.url = credentials.url;
                return self.config;
            });
        }
        return configuration();
    }
    private login(config): Promise<forceCode.IForceService> {
        var self: forceCode.IForceService = vscode.window.forceCode;
        // Lazy-load the connection
        if (self.userInfo === undefined || self.config.username !== self.username || !self.config.password) {
            var connectionOptions: any = {
                loginUrl: self.config.url || 'https://login.salesforce.com',
            };
            if (self.config.proxyUrl) {
                connectionOptions.proxyUrl = self.config.proxyUrl;
            }
            self.conn = new jsforce.Connection(connectionOptions);

            if (!config.username || !config.password) {
                vscode.window.forceCode.statusBarItem.text = `ForceCode: $(alert) Missing Credentials $(alert)`;
                throw { message: 'No Credentials' };
            }
            vscode.window.forceCode.statusBarItem.text = `ForceCode: $(plug) Connecting as ${config.username}`;
            return self.conn
                .login(config.username, config.password)
                .then(connectionSuccess)
                .then(getNamespacePrefix)
                .catch(connectionError);
            function connectionSuccess(userInfo) {
                vscode.window.forceCode.statusBarItem.text = `ForceCode: $(zap) Connected as ${self.config.username} $(zap)`;
                self.outputChannel.appendLine(`Connected as ${JSON.stringify(userInfo)}`);
                self.userInfo = userInfo;
                self.username = config.username;
                return self;
            }
            function connectionError(err) {
                vscode.window.forceCode.statusBarItem.text = `ForceCode: $(alert) Connection Error $(alert)`;
                self.outputChannel.appendLine('================================================================');
                self.outputChannel.appendLine(err.message);
                throw err;
            }
            function getNamespacePrefix(svc: forceCode.IForceService) {
                return svc.conn.query('SELECT NamespacePrefix FROM Organization').then(res => {
                    if (res && res.records.length && res.records[0].NamespacePrefix) {
                        svc.config.prefix = res.records[0].NamespacePrefix;
                    }
                    return svc;
                });
            }
        } else {
            // self.outputChannel.appendLine(`Connected as ` + self.config.username);
            // vscode.window.forceCode.statusBarItem.text = `ForceCode: $(history) ${self.config.username}`;
            return Promise.resolve(self);
        }
    }
}
