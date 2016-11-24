import * as vscode from 'vscode';
import * as forceCode from './../forceCode';
import * as fs from 'fs-extra';
import {constants, operatingSystem} from './../services';
import { configuration } from './../services';
import * as commands from './../commands';
const jsforce: any = require('jsforce');

export default class ForceService implements forceCode.IForceService {
    public config: forceCode.Config;
    public conn: any;
    public containerId: string;
    public containerAsyncRequestId: string;
    public userInfo: any;
    public username: string;
    public statusBarItem: vscode.StatusBarItem;
    public outputChannel: vscode.OutputChannel;
    public operatingSystem: string;
    public pathSeparator: string;

    constructor() {
        // Set the ForceCode configuration
        this.pathSeparator = operatingSystem.isWindows() ? '\\' : '/';
        this.operatingSystem = operatingSystem.getOS();
        // Setup username and outputChannel
        this.outputChannel = vscode.window.createOutputChannel(constants.OUTPUT_CHANNEL_NAME);
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 5);
        this.statusBarItem.command = 'ForceCode.showMenu';
        this.statusBarItem.tooltip = 'Open the ForceCode Menu';
        this.statusBarItem.text = 'ForceCode: Active';
        configuration(this).then(config => {
            this.username = config.username || '';
            this.conn = new jsforce.Connection({
                loginUrl: config.url || 'https://login.salesforce.com'
            });
            this.statusBarItem.text = 'ForceCode: Connected as ${config.username}';
        }).catch(err => {
            this.statusBarItem.text = 'ForceCode: Not Connected';
        });
        this.statusBarItem.show();
    }
    public connect(): Promise<forceCode.IForceService> {
        return this.setupConfig().then(config => this.login(config));
    }

    public clearLog() {
        this.outputChannel.clear();
    };

    public newContainer(): Promise<forceCode.IForceService> {
        var self: forceCode.IForceService = vscode.window.forceCode;
        return self.conn.tooling.sobject('MetadataContainer')
            .create({ name: 'ForceCode-' + Date.now() })
            .then(res => {
                self.containerId = res.id;
                return self;
            });
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
            self.conn = new jsforce.Connection({
                loginUrl: self.config.url || 'https://login.salesforce.com'
            });

            if (!config.username || !config.password) {
                vscode.window.forceCode.statusBarItem.text = `ForceCode: $(alert) Missing Credentials $(alert)`;
                throw { message: 'No Credentials' };
            }
            vscode.window.forceCode.statusBarItem.text = `ForceCode: $(plug) Connecting as ${config.username}`;
            return self.conn.login(config.username, config.password).then((userInfo) => {
                vscode.window.forceCode.statusBarItem.text = `ForceCode: $(zap) Connected as ${self.config.username} $(zap)`;
                self.outputChannel.appendLine(`Connected as username. ${JSON.stringify(userInfo)}`);
                self.userInfo = userInfo;
                self.username = config.username;
                return self;
            }).catch(err => {
                vscode.window.forceCode.statusBarItem.text = `ForceCode: $(alert) Connection Error $(alert)`;
                self.outputChannel.appendLine('================================================================');
                self.outputChannel.appendLine(err.message);
                throw err;
            });
        } else {
            // self.outputChannel.appendLine(`Connected as ` + self.config.username);
            // vscode.window.forceCode.statusBarItem.text = `ForceCode: $(history) ${self.config.username}`;
            return Promise.resolve(self);
        }
    }
}
