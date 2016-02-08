// import jsforce = require('jsforce');
// import * as fs from 'fs';
// import keychain from 'keychain';
// import commandLineArgs from 'command-line-args';
// import inquirer from "inquirer";

// interface Auth {
//     accessToken?: string;
//     serverUrl?: string;
// }
// interface Options {
//     silent?: boolean;
//     user?: string;
// }

// class Connection {
//     public jsforce: any = require('jsforce');
//     public conn: jsforce.Connection = new this.jsforce.Connection();
//     public auth: Auth = {};

//     // Replace with Yargs
//     public options: Options = this.cli.parse();
//     public cli: commandLineArgs = commandLineArgs([
//         {
//             alias: 's',
//             defaultOption: false,
//             name: 'silent',
//             type: Boolean,
//         },
//         {
//             alias: 'u',
//             name: 'user',
//             type: String,
//         }
//     ]);
//     // Inquirer questions
//     public questions: {}[] = [
//         {
//             default: process.env.SFDC_USERNAME || '(no env default set)',
//             message: 'Enter your SFDC username',
//             name: 'username',
//             type: 'input',
//         },
//         {
//             default: process.env.SFDC_PASSWORD,
//             message: 'Enter your SFDC password',
//             name: 'password',
//             type: 'password',
//         }

//     ];
//     // ================================================================================================================
//     // ==================================                Constructor             ======================================
//     // ================================================================================================================
//     constructor() {
//         const account: string = this.options.user || process.env.SFDC_USERNAME;

//         try {
//             this.auth = JSON.parse(fs.readFileSync('auth.json', 'utf8'));
//         } catch (exception) {
//             console.log('no auth.json found');
//         }
//         // Setup Connection based on accessToken, if it exists in the current configuration
//         if (this.auth.accessToken) {
//             this.conn = new this.jsforce.Connection({
//                 accessToken: this.auth.accessToken,
//                 serverUrl: this.auth.serverUrl || 'https://login.salesforce.com'
//             });
//         }
//         // 
//         if (!this.options.silent) {
//             if (!this.auth.accessToken) {
//                 console.log('no auth token found. please login');
//                 this.promptLogin();
//             } else {
//                 console.log('using auth token');
//                 this.conn.identity().then(userInfo => {
//                     this.userGreeting(userInfo);
//                 }, this.handleConnectionError);
//             }
//         } else {
//             // Silent mode 
//             this.getPass(account)
//             .then( pass => this.conn.login(account, pass))
//             .then( () => this.conn.identity())
//             .then(identity => console.log('Identity', identity))
//             .catch(this.handleConnectionError);
//         }
//     }
//     // ================================================================================================================
//     // ==================================                Methods                 ======================================
//     // ================================================================================================================
//     public saveJSON(path, data) {
//         'use strict';
//         fs.writeFile(path, JSON.stringify(data));
//     };
//     public saveAuth() {
//         'use strict';
//         this.saveJSON('./auth.json', this.auth);
//     };
//     public getAnswers() {
//         'use strict';
//         return new Promise((resolve, reject) => {
//             inquirer.prompt(this.questions, answers => {
//                 if (typeof answers === 'object') {
//                     process.env.SFDC_USERNAME = answers.username;
//                     process.env.SFDC_PASSWORD = answers.password;
//                     keychain.setPassword({ account: answers.username, service: 'SFDC', password: answers.password }, (err) => {
//                         if (err) {
//                             console.error('error', err);
//                         }
//                     });
//                     resolve(answers);
//                 } else {
//                     reject(answers);
//                 }
//             });
//         });
//     };
//     public login(answers) {
//         'use strict';
//         return this.conn.login(answers.username, answers.password, (err, userInfo) => {
//             if (err) {
//                 return console.error(err);
//             }
//             this.auth.accessToken = this.conn.accessToken;
//             this.auth.serverUrl = this.conn.instanceUrl;
//             this.saveAuth();
//         });
//     };
//     public promptLogin() {
//         'use strict';
//         this.getAnswers().then(answers => {
//             this.login(answers);
//         }).then(undefined, err => {
//             console.error('error', err);
//         });
//     };
//     public userGreeting(user) {
//         'use strict';
//         if (!this.options.silent) {
//             console.log('Hello', user.display_name, ' [', user.username, '] ', user.user_id, '@', user.organization_id);
//         }
//     };
//     public handleConnectionError(err) {
//         'use strict';
//         console.log('there was an error', err);
//         if (err.errorCode === 'INVALID_SESSION_ID') {
//             console.log('Invalid or expired Session Id. Login again please.');
//             this.promptLogin();
//         }
//     };
//     public getPass(account): Promise<string> {
//         'use strict';
//         return new Promise((resolve, reject) => {
//             keychain.getPassword({ account: account, service: 'SFDC' }, (keychainError, pass) => {
//                 if (keychainError) {
//                     reject(keychainError);
//                 } else {
//                     resolve(pass);
//                 }
//             });
//         });
//     };
//     public setPass(account, password) {
//         'use strict';
//         return new Promise((resolve, reject) => {
//             keychain.setPassword({ account: account, service: 'SFDC', password: password }, (err) => {
//                 if (err) { console.error('error', err); }
//             });
//         });
//     };
// }
