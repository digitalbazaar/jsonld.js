console.log('building node version...');
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';

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
  commonjs({
    include: [
      'node_modules/**',
      // for the case where this is installed as a sub-dependency
      '../node_modules/**',
    ],
  }),
  babel({
    exclude: [
      'node_modules/**',
      // for the case where this is installed as a sub-dependency
      //'../node_modules/**',
    ]
  }),
];

export default config;
