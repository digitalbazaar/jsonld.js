/**
 * jsonld.js webpack build rules for unit tests.
 *
 * @author Digital Bazaar, Inc.
 *
 * Copyright 2011-2017 Digital Bazaar, Inc.
 */
const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: {
    'jsonld-tests': './tests/test-karma.js'
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
    library: '[name]',
    libraryTarget: 'umd'
  },
  resolve: {
    alias: {
      //'commander': '../browser/ignore.js',
      //'system': '../browser/ignore.js',
      //'fs': '../browser/ignore.js'
    }
  },
  node: {
    Buffer: false,
    process: false,
    crypto: false,
    setImmediate: false
  }
};
