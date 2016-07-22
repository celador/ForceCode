module.exports = function () {
  return {
    files: [
      'src/'
    ],
    tests: [
      'test/*.spec.js'
    ],
    'testFramework': 'mocha',
    env: {
      type: 'node'
    }
  }
}
