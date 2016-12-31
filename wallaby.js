module.exports = function () {
  return {
    files: [
      'src/**/*.ts'
    ],
    tests: [
      'test/open.spec.js'
    ],
    'testFramework': 'mocha',
    env: {
      type: 'node'
    }
  }
}
