module.exports = function () {
  return {
    files: [
      'src/**/*.ts'
    ],
    tests: [
      'test/*.test.js'
    ],
    'testFramework': 'mocha',
    env: {
      type: 'node'
    }
  }
}
