import * as path from 'path';
import * as fs from 'fs-extra';

import { runTests, downloadAndUnzipVSCode } from '@vscode/test-electron';

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to the extension test script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // create test folder to open
    const folderPath = path.join(extensionDevelopmentPath, 'dist', 'test', 'test');
    if (fs.existsSync(folderPath)) {
      fs.removeSync(folderPath);
    }
    fs.mkdirpSync(folderPath);

    // Download VS Code, unzip it and run the integration test
    // TODO this is temporary until MS fixes the errors with CI/CD and any version of VSCode > 1.60.0
    const vscodeExecutablePath = await downloadAndUnzipVSCode('1.60.0');
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [folderPath],
      vscodeExecutablePath,
    });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();
