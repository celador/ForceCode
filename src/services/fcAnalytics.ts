import * as vscode from 'vscode';
import constants from '../models/constants';
import { operatingSystem } from '.';
import { Visitor } from 'universal-analytics';
import * as path from 'path';
import * as fs from 'fs-extra';
const uuidv4 = require('uuid/v4');

const fcVersion = vscode.extensions.getExtension('JohnAaronNelson.forcecode').packageJSON.version;
const fcHomeFolder = path.join(operatingSystem.getHomeDir(), '.forceCode');
const fcAnalyticsFile = path.join(fcHomeFolder, 'analytics.json');

export interface FCAnalytics {
  firstTime: boolean;
  uuid: string;
}

/*
 * This will send tracking info to GA
 *  Each time it will send the FC version + category param as the category, the OS as the event action,
 *      and the message param as the event label.
 *
 * This will be used to track errors and how much the extension is used.
 */
export function trackEvent(category: string, message: string): Promise<any> {
  return new Promise(resolve => {
    // check if the user has opted in to tracking
    if (optIn()) {
      const params = {
        ec: fcVersion + ' - ' + category,
        ea: operatingSystem.getOS(),
        el: message,
      };
      const analytics: Visitor = new Visitor(
        constants.GA_TRACKING_ID,
        vscode.window.forceCode.uuid
      );
      analytics
        .event(params, response => {
          if (!response) {
            // according to universal-analytics, no response from the callback is a success
            resolve(true);
          }
          resolve(false);
        })
        .send();
    } else {
      resolve(false);
    }
  });
}

export function getUUID(): FCAnalytics {
  if (fs.existsSync(fcAnalyticsFile)) {
    return { firstTime: false, uuid: fs.readJsonSync(fcAnalyticsFile).uuid };
  } else {
    const uuid = uuidv4();
    saveUUID(uuid);
    return { firstTime: true, uuid: uuid };
  }
}

function saveUUID(newUUID: string) {
  if (!fs.existsSync(fcHomeFolder)) {
    fs.mkdirpSync(fcHomeFolder);
  }
  fs.outputFileSync(fcAnalyticsFile, JSON.stringify({ uuid: newUUID }, undefined, 4));
}

function optIn(): boolean {
  const debug = false; //vscode.env.machineId === 'someValue.machineId';
  // turn off analytics when we are debugging
  return vscode.workspace.getConfiguration('force').get('allowAnonymousUsageTracking') && !debug;
}
