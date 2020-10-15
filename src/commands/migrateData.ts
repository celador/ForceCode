import * as vscode from 'vscode';
import { ForcecodeCommand } from '.';
import { fcConnection, FCOauth, notifications } from '../services';
import { dxService } from '../services';

export class MigrateData extends ForcecodeCommand {
    constructor() {
        super();
        this.commandName = 'ForceCode.migrateData';
        this.name = 'Migrate data';
        this.hidden = false;
        this.description = 'Migrate data via the Bulk API';
        this.detail = 'Migrate data based on a SOQL query from one org to another.';
        this.icon = 'mirror';
        this.label = 'Migrate data';
    }

    public command(): Promise<any> {
        // TODO test data:
        // select test_extId__c, name from account where name like '%test'
        // test_extId__c
        // TODO list out objects and fields and let the user select instead of a query...
        return dxService.orgList().then(orgs => {
            const qpOptions: vscode.QuickPickOptions = {
                ignoreFocusOut: true,
                placeHolder: 'Select the source org',
            };

            return getOrg(getUserNameListAsOptions(orgs), qpOptions).then((sourceOrg) => {
                qpOptions.placeHolder = 'Select the destination org';
                return getOrg(getUserNameListAsOptions(orgs, sourceOrg), qpOptions).then((destOrg) => {
                    return getExtIdField().then((extIdIn) => {
                        return getSOQLQuery().then(async (queryString) => {
                            // get object name from query string
                            let objName = queryString.toLowerCase().split(' from ').pop()?.trim().split(' ').shift();

                            if (!objName) {
                                return Promise.reject('No object name found in query');
                            }

                            let currentConnection = fcConnection.currentConnection;
                            // check connections 
                            let connPromises: Array<Promise<boolean>> = [];
                            let fcConn1 = fcConnection.getConnByUsername(sourceOrg);
                            if (!fcConn1?.connection) {
                                connPromises.push(fcConnection.connect(fcConn1?.orgInfo, this.cancellationToken));
                            }
                            let fcConn2 = fcConnection.getConnByUsername(destOrg);
                            if (!fcConn2?.connection) {
                                connPromises.push(fcConnection.connect(fcConn2?.orgInfo, this.cancellationToken));
                            }

                            await Promise.all(connPromises);

                            if (currentConnection !== fcConnection.currentConnection) {
                                await fcConnection.connect(currentConnection?.orgInfo, this.cancellationToken);
                            }

                            let conn1 = fcConn1?.connection;
                            let conn2 = fcConn2?.connection;

                            if (conn1 == undefined || conn2 == undefined) {
                                return Promise.reject('Connection not found');
                            }

                            let query = conn1.query(queryString);
                            let bulkOptions;
                            let operation = 'insert';
                            if (extIdIn.trim() !== '') {
                                bulkOptions = {
                                    extIdField: extIdIn,
                                }
                                operation = 'upsert';
                            }
                            let job = conn2.bulk.createJob(objName, operation, bulkOptions);
                            let batch = job.createBatch();
                            query.pipe(batch);
                            batch.on('queue', function (data: any) {
                                notifications.writeLog(data);
                                notifications.showInfo(`Job ${data.state} with Id of ${data.jobId}. Batch Id: ${data.id}`);
                                //TODO figure out how to close the bulk job after the batches complete or possibly when FC is shut down?? 
                                // maybe keep a list of job Ids (to close) and batch Ids to poll at various times
                            });
                        });
                    });
                });
            });
        });

        // HELPER Functions................................................................
        function getUserNameListAsOptions(orgs: FCOauth[], filter?: string): vscode.QuickPickItem[] {
            let filteredOrgs: FCOauth[] = orgs;
            if (filter) {
                filteredOrgs = orgs.filter((org) => org.username !== filter);
            }
            return filteredOrgs.map((org) => { return { label: org.username } });
        }

        function getOrg(options: vscode.QuickPickItem[], qpOptions: vscode.QuickPickOptions): Promise<string> {
            return new Promise<string>((resolve, reject) => {
                return vscode.window
                    .showQuickPick(options, qpOptions)
                    .then((res: vscode.QuickPickItem | undefined) => {
                        if (!res || res.label === undefined) {
                            return reject(undefined);
                        } else {
                            return resolve(res.label);
                        }
                    });
            });
        }

        function getSOQLQuery(): Promise<string> {
            let options: vscode.InputBoxOptions = {
                placeHolder: 'SELECT Id ... FROM ... WHERE ...',
                prompt: `Enter SOQL Query`,
                ignoreFocusOut: true,
            };
            return getInput(options);
        }

        function getExtIdField(): Promise<string> {
            let options: vscode.InputBoxOptions = {
                placeHolder: 'EX: myExtIdField__c',
                prompt: `Enter an external Id Field (Optional, press Enter to skip)`,
                ignoreFocusOut: true,
            };
            return getInput(options);
        }

        function getInput(options: vscode.InputBoxOptions): Promise<string> {
            return new Promise((resolve, _reject) => {
                vscode.window.showInputBox(options).then(query => {
                    if (!query) {
                        return resolve('');
                    } else {
                        return resolve(query);
                    }
                });
            });
        }
    }
}
