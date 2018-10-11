import * as vscode from 'vscode';
import constants from '../models/constants'
import { operatingSystem } from '.';
import { Visitor } from 'universal-analytics';
const pjson = require('./../../../package.json');

/*
 * This will send tracking info to GA
 *  Each time it will send the category param as the category, the OS as the event action,
 *      the message param as the event label, and the ForceCode version as the value (integer).
 * 
 * This will be used to track errors and how much the extension is used.
 */
export function trackEvent(category: string, message: string): Promise<any> {
    return new Promise((resolve) => {
        // check if the user has opted in to tracking
        if(optIn()) {
            const params = {
                ec: category,
                ea: operatingSystem.getOS(),
                el: message,
                ev: Number.parseInt(pjson.version.split('.').join('')),
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
    return vscode.window.forceCode.uuid !== 'OPT-OUT';
}