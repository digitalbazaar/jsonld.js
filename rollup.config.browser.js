console.log('building version for browser...');

import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import includePaths from 'rollup-plugin-includepaths';
import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';

var fs = require('fs-extra');
var path = require('path');
var pkg = require('./package.json');

import config from './rollup.config';

config.format = 'umd';
config.dest = 'dist/browser/jsonld.js';

config.outro = [
  config.outro || '',
  fs.readFileSync(path.join('./lib/outro.browser.js'))
].join('\n');

config.footer = [
  config.footer || '',
  'window.jsonldjs = window.jsonld;',
  'window.jsonld.version = \'' + pkg.version + '\';'
].join('\n');

config.plugins = [
  includePaths({
    include: {
      './NormalizeHashDOT_init.js': './lib/NormalizeHashDOT_init.browser.js',
      './node-polyfiller.js': './lib/placeholder.js',
      'superagent-cache': './lib/placeholder.js',
      'cache-service-cache-module': './lib/placeholder.js',
    },
    paths: ['lib', 'node_modules', '../node_modules'],
    extensions: ['.js', '.json', '.html']
  }),
  nodeResolve({
    jsnext: true,
    main: true,
    browser: true,
  }),
  commonjs({
    include: [
      'node_modules/**',
      // below is a kludge needed to make this work when
      // jsonld.js is a sub-module.
      // TODO file bug report with rollup-plugin-commonjs.
      //      what happens with older versions of npm (nested deps)?
      '../**',
    ],
  }),
  uglify(),
  babel({
    exclude: [
      'node_modules/**',
    ]
  }),
];

export default config;
