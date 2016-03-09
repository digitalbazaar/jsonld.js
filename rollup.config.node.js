console.log('building version for Node.js...');

import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import includePaths from 'rollup-plugin-includepaths';
import nodeResolve from 'rollup-plugin-node-resolve';

import config from './rollup.config';

var fs = require('fs-extra');
var path = require('path');
var pkg = require('./package.json');

config.format = 'cjs';
config.dest = 'dist/node/jsonld.js';

config.intro = (config.intro ? [config.intro] : [])
.concat([
  'require(\'es6-promise\').polyfill();'
])
.join('\n');

config.outro = (config.outro ? [config.outro] : [])
.concat([
  'factory.version = \'' + pkg.version + '\';'
])
.join('\n');

config.plugins = [
  includePaths({
    include: {
      'Promise': './node_modules/es6-promise/dist/es6-promise.js'
    }
  }),
  commonjs({
    include: [
      'node_modules/**',
    ],
  }),
  babel({
    exclude: [
      'node_modules/**',
    ]
  }),
];

export default config;
