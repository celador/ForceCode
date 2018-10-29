import * as vscode from 'vscode';
import constants from '../models/constants'
import { operatingSystem } from '.';
import { Visitor } from 'universal-analytics';
import * as path from 'path';
import * as fs from 'fs-extra';
const pjson = require('./../../../package.json');

/*
 * This will send tracking info to GA
 *  Each time it will send the FC version + category param as the category, the OS as the event action,
 *      and the message param as the event label.
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

/*
 * This method will copy over the analytics.json file (If found) from a previous ForceCode install.
 * The purpose of this is to not lose track of tracking information, since it's based on the UUID.
 * Without this, the total user count would rise each time a new version of ForceCode is released and 
 * would throw analytics way off.
 * 
 * Updated 10/19/18 - added extra checks for beta versions. A full release will never have the 4th
 * number, so if there are two versions where the first three parts of the version number are equal,
 * but one version has a 4th part then the one with 3 parts will always trump the one with 4.
 *
 */
export function getPreviousUUID(fcExtPath): boolean {
    const debug = vscode.env.machineId === 'someValue.machineId';
    const currentVersion: string = pjson.version;
    var extensionsPath: string;
    // if we're debugging, the path will be wrong to the installed extensions
    if(debug) {
        extensionsPath = path.join(operatingSystem.getHomeDir(), '.vscode', 'extensions');
    } else {
        extensionsPath = fcExtPath.substring(0, fcExtPath.lastIndexOf(path.sep));
    }
    const contents: string[] = fs.readdirSync(extensionsPath);
    var toCheck: string[] = [];

    contents.forEach(folder => {
        if(folder.indexOf('johnaaronnelson.forcecode-') !== -1 
            && folder.indexOf('johnaaronnelson.forcecode-' + currentVersion) === -1) {
                // account for the possibility of there being many (not likely, but could be possible)
                toCheck.push(folder);
        }
    });

    if(toCheck.length > 0) {
        // get the newest version installed before the current version
        const lastVersion: string = toCheck.reduce((ver1, ver2) => {
            const ver1String: string = ver1.split('johnaaronnelson.forcecode-')[1];
            const ver2String: string = ver2.split('johnaaronnelson.forcecode-')[1];
            const ver1Beta: string = ver1String.split('-').pop();
            const ver2Beta: string = ver2String.split('-').pop();
            const ver1Parts: number[] = ver1String.split('-')[0].split('.').map(part => parseInt(part));
            const ver2Parts: number[] = ver2String.split('-')[0].split('.').map(part => parseInt(part));
            if(ver1Parts[0] !== ver2Parts[0]) {
                return ver1Parts[0] > ver2Parts[0] ? ver1 : ver2;
            } else if(ver1Parts[1] !== ver2Parts[1]) {
                return ver1Parts[1] > ver2Parts[1] ? ver1 : ver2;
            } else if(ver1Parts[2] !== ver2Parts[2]) {
                return ver1Parts[2] > ver2Parts[2] ? ver1 : ver2;
            } else if(ver1Beta !== ver1String && ver2Beta !== ver2String) {
                return parseInt(ver1Beta) > parseInt(ver2Beta) ? ver1 : ver2;
            } else if(ver1Beta === ver1String) {
                return ver1;
            } else {
                return ver2;
            }
        });

        // if the analytics.json file exists in the previous install then copy it over
        if(fs.existsSync(path.join(extensionsPath, lastVersion, 'analytics.json'))) {
            fs.copyFileSync(path.join(extensionsPath, lastVersion, 'analytics.json'), path.join(fcExtPath, 'analytics.json'));
            return true;
        }
    }
    return false;
}

function optIn(): boolean {
    const debug = vscode.env.machineId === 'someValue.machineId';
    // turn off analytics when we are dubugging
    return vscode.window.forceCode.uuid !== 'OPT-OUT' && !debug;
}
