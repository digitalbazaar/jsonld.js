import babel from 'rollup-plugin-babel';

import config from './rollup.config';

var fs = require('fs-extra');
var path = require('path');
var pkg = require('./package.json');

config.format = 'cjs';
config.dest = 'dist/node/jsonld.js';

config.outro = [
  config.outro || '',
  'factory.version = \'' + pkg.version + '\';'
].join('\n');

config.plugins = [
  babel({
    exclude: 'node_modules/**'
  }),
];

export default config;
