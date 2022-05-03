module.exports = {
  env: {
    browser: true,
    commonjs: true,
    node: true,
    es2020: true
  },
  extends: 'eslint-config-digitalbazaar',
  root: true,
  ignorePatterns: [
    'dist/',
    'tests/webidl/WebIDLParser.js',
    'tests/webidl/idlharness.js',
    'tests/webidl/testharness.js'
  ]
};
