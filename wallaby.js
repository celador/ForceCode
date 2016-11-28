module.exports = function () {
  return {
    files: [
      'src/**/*.ts'
    ],
    tests: [
      'test/*.spec.ts'
    ],
    'testFramework': 'mocha',
    env: {
      type: 'node'
    }
  }
}
