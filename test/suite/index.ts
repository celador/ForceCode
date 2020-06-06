import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';
const NYC = require('nyc');

export async function run(): Promise<void> {
  const nyc = new NYC({
    cwd: path.resolve(__dirname, '..', '..', '..'),
    reporter: ['cobertura'],
    instrument: true,
    hookRequire: true,
    hookRunInContext: true,
    hookRunInThisContext: true,
  });
  await nyc.createTempDirectory();
  nyc.wrap();

  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 180000, // 3 minutes...code completion can take a while
  });

  const testsRoot = path.resolve(__dirname, '..');

  const files: Array<string> = await new Promise((resolve, reject) =>
    glob(
      '**/**.test.js',
      {
        cwd: testsRoot,
      },
      (err, files) => {
        if (err) reject(err);
        else resolve(files);
      }
    )
  );

  // Add files to the test suite
  files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

  const failures: number = await new Promise(resolve => mocha.run(resolve));
  await nyc.writeCoverageFile();
  nyc.report();

  if (failures > 0) {
    throw new Error(`${failures} tests failed.`);
  }
}
