import { spawn, SpawnOptions } from 'child_process';
import { isWindows } from '../services/operatingSystem';

export const runCommand = (fullCommand: string): Promise<any> => {
  // TODO: get rid of debug console lines
  console.log(fullCommand);
  if (isWindows()) {
    fullCommand = 'cmd /c' + fullCommand;
  }
  const error = new Error(); // Get stack here to use for later

  if (!fullCommand.includes('--json')) {
    fullCommand += ' --json';
  }

  const parts = fullCommand.split(' ');
  const commandName = parts[0];
  const args = parts.slice(1);

  const spawnOpt: SpawnOptions = {
    // Always use json in stdout
    env: Object.assign({ SFDX_JSON_TO_STDOUT: 'true' }, process.env),
  };

  return new Promise((resolve, reject) => {
    const cmd = spawn(commandName, args, spawnOpt);
    if (cmd === null || cmd.stdout === null || cmd.stderr === null) {
      return reject();
    } else {
      let stdout = '';
      cmd.stdout.on('data', data => {
        stdout += data;
      });

      cmd.stderr.on('data', data => {
        console.warn('srderr', data);
      });

      cmd.on('error', data => {
        console.error('err', data);
      });

      cmd.on('close', code => {
        let json;
        try {
          json = JSON.parse(stdout);
        } catch (e) {
          console.warn(`No parsable results from command "${fullCommand}"`);
        }
        if (code > 0) {
          // Get non-promise stack for extra help
          console.warn(error);
          reject(error);
        } else {
          console.log(json.result);
          resolve(json.result);
        }
      });
    }
  });
};
