import os = require('os');
export function isWindows() {
  return os.platform().startsWith('win');
}
export function isLinux() {
  return os.platform().startsWith('linux');
}
export function isMac() {
  return os.platform().startsWith('darwin');
}
export function getOS() {
  return os.platform();
}

export function getHomeDir() {
  return os.homedir();
}
