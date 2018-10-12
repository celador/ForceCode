import * as vscode from 'vscode';
import constants from '../models/constants'
import { operatingSystem } from '.';
import { Visitor } from 'universal-analytics';
const pjson = require('./../../../package.json');

/*
 * This will send tracking info to GA
 *  Each time it will send the FC version + category param as the category, the OS as the event action,
 *      the message param as the event label, and the ForceCode version as the value (integer).
 * 
 * This will be used to track errors and how much the extension is used.
 */
export function trackEvent(category: string, message: string): Promise<any> {
    return new Promise((resolve) => {
        // check if the user has opted in to tracking
        if(optIn()) {
            const params = {
                ec: pjson.version + ' - ' + category,
                ea: operatingSystem.getOS(),
                el: message,
              }
            const analytics: Visitor = new Visitor(constants.GA_TRACKING_ID, vscode.window.forceCode.uuid);
            analytics.event(params, (response) => {
                if(!response) {
                    // according to universal-analytics, no response from the callback is a success
                    resolve(true);
                }
                resolve(false);
            }).send();
        } else {
            resolve(false);
        }
    });
}

function optIn(): boolean {
    const debug = vscode.env.machineId === 'someValue.machineId';
    // turn off analytics when we are dubugging
    return vscode.window.forceCode.uuid !== 'OPT-OUT' && !debug;
}