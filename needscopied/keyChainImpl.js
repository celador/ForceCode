"use strict";
/*
* Copyright (c) 2016, salesforce.com, inc.
* All rights reserved.
* Licensed under the BSD 3-Clause license.
* For full license text, see LICENSE.txt file in the repo root  or https://opensource.org/licenses/BSD-3-Clause
*/
const path = require('path');
const fs = require('fs');
const almError = require(path.join(__dirname, 'almError'));
const keychain = require(path.join(__dirname, 'keyChain'));
const logApi = require(path.join(__dirname, 'logApi'));
const srcDevUtil = require(path.join(__dirname, 'srcDevUtil'));
const util = require('util');
require('util.promisify').shim();
const Promise = require('bluebird');
const logger = logApi.child('keyChainImpl');
const fsOpenPromise = util.promisify(fs.open);
let Org;
const _usingGenericKeychain = function () {
    const keyPath = path.join(srcDevUtil.getGlobalHiddenFolder(), 'key.json');
    logger.debug(`keyPath: ${keyPath}`);
    return fsOpenPromise(keyPath, 'r')
        .then(() => {
        logger.debug('keyPath found.');
        return true;
    })
        .catch((err) => {
        if (err.code === 'ENOENT') {
            logger.debug('keyPath not found');
            return false;
        }
        logger.debug(err.message);
        throw err;
    });
};
module.exports.DEPRECATED_KEYCHAIN = 'DEPRECATED_KEYCHAIN';
module.exports.retrieveKeychainImpl = function (platform) {
    if (!Org) {
        Org = require(path.join(__dirname, 'scratchOrgApi')); // eslint-disable-line global-require
    }
    logger.debug(`platform: ${platform}`);
    const useGenericUnixKeychain = srcDevUtil.useGenericUnixKeychain();
    return Promise.all([_usingGenericKeychain(), Org.hasAuthentications()])
        .spread((isUsingGenericKeychain, hasAuthentications) => {
        logger.debug(`isUsingGenericKeychain: ${isUsingGenericKeychain}`);
        logger.debug(`hasAuthentications: ${hasAuthentications}`);
        if (/^win/.test(platform)) {
            if (useGenericUnixKeychain) {
                return keychain.generic_windows;
            }
            else {
                if (!isUsingGenericKeychain && !hasAuthentications) {
                    return keychain.generic_windows;
                }
                if (!isUsingGenericKeychain && hasAuthentications) {
                    const error = new Error();
                    error.name = module.exports.DEPRECATED_KEYCHAIN;
                    error.fromKeychain = keychain.windows;
                    error.toKeychain = keychain.generic_windows;
                    throw error;
                }
                return keychain.generic_windows;
            }
        }
        else if (/darwin/.test(platform)) {
            // OSX can use the generic keychain. This is useful when running under an
            // automation user.
            if (useGenericUnixKeychain) {
                return keychain.generic_unix;
            }
            else {
                return keychain.darwin;
            }
        }
        else if (/linux/.test(platform)) {
            // Use the generic keychain if specified
            if (useGenericUnixKeychain) {
                return keychain.generic_unix;
            }
            else {
                // otherwise try and use the builtin keychain
                try {
                    keychain.linux.validateProgram();
                    return keychain.linux;
                }
                catch (e) {
                    // If the builtin keychain is not available use generic
                    return keychain.generic_unix;
                }
            }
        }
        else {
            throw almError('UnsupportedOperatingSystem', [platform]);
        }
    });
};

//# sourceMappingURL=keyChainImpl.js.map
