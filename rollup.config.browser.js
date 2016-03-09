console.log('building browser version...');
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
  commonjs({
    include: [
      'node_modules/**',
      '../node_modules/**',
      //'/Users/andersriutta/Sites/jsonld-rx/node_modules/**',
    ],
  }),
  //*
  nodeResolve({
    //jsnext: true,
    main: true,
    browser: true,
  }),
  //*/
  uglify(),
  babel({
    exclude: [
      'node_modules/**',
    ]
  }),
];

export default config;
