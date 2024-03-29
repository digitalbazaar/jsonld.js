module.exports = {
  root: true,
  env: {
    browser: true,
    commonjs: true,
    node: true,
    es2020: true
  },
  extends: [
    'digitalbazaar'
  ],
  ignorePatterns: [
    'coverage/',
    'dist/',
    'test-suites',
    'tests/webidl/WebIDLParser.js',
    'tests/webidl/idlharness.js',
    'tests/webidl/testharness.js'
  ]
};
