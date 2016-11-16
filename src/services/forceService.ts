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
    public outputChannel: vscode.OutputChannel;
    public operatingSystem: string;
    public pathSeparator: string;

    constructor() {
        // Set the ForceCode configuration
        this.pathSeparator = operatingSystem.isWindows() ? '\\' : '/';
        try {
            this.config = fs.readJsonSync(vscode.workspace.rootPath + this.pathSeparator + 'force.json');
        } catch (err) {
            this.config = {};
        }
        // Setup username and outputChannel
        this.operatingSystem = operatingSystem.getOS();
        this.username = this.config.username || '';
        this.outputChannel = vscode.window.createOutputChannel(constants.OUTPUT_CHANNEL_NAME);
        this.conn = new jsforce.Connection({
            loginUrl: this.config.url || 'https://login.salesforce.com'
        });
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
        // Set the ForceCode configuration

        // Setup username and outputChannel
        self.username = self.config.username || '';
        if (!self.config.username) {
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
                vscode.window.setStatusBarMessage(`ForceCode: $(alert) Missing Credentials $(alert)`);
                throw { message: 'No Credentials' };
            }
            vscode.window.setStatusBarMessage(`ForceCode: $(plug) Connecting as ${config.username}`);
            return self.conn.login(config.username, config.password).then((userInfo) => {
                vscode.window.setStatusBarMessage(`ForceCode: $(zap) Connected $(zap)`);
                self.outputChannel.appendLine(`Connected as username. ${JSON.stringify(userInfo)}`);
                self.userInfo = userInfo;
                self.username = config.username;
                return self;
            }).catch(err => {
                vscode.window.setStatusBarMessage(`ForceCode: $(alert) Connection Error $(alert)`);
                self.outputChannel.appendLine('================================================================');
                self.outputChannel.appendLine(err.message);
                throw err;
            });
        } else {
            // vscode.window.setStatusBarMessage(`ForceCode: $(history) Connected as ${self.config.username}`);
            return Promise.resolve(self);
        }
    }
}
