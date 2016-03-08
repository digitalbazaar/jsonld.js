import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import includePaths from 'rollup-plugin-includepaths';
import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';

var argv = require('minimist')(process.argv.slice(2));
var modules = (argv.modules || '').split(',');

// jsonld.expand only size: 88106
//var moduleImportString = 'import {' + modules.join(',') + '} from \'./jsonld.js\';';

//* jsonld.expand only size: 68938
var moduleImportString = modules.map(function(item) {
  return 'import {' + item + '} from \'./' + item + '.js\';';
})
.join('\n');
//.join(';\n');
//*/

var modulesObjectString = JSON.stringify(modules.reduce(function(accumulator, item) {
  accumulator[item] = item;
  return accumulator;
}, {})).replace(/\"/g, '');

var fs = require('fs');
var entryString = moduleImportString + fs.readFileSync('./lib/custom.js', {encoding: 'utf8'})
  // TODO kludgy side-effects!
  .replace(/^.*import\ {.*}\ from.*$(?:\n^$)*/gm, '')
  .replace(/(jsonldModule\ =\ ){.*}/gm, '$1' + modulesObjectString);

fs.writeFileSync('./lib/custom.js', entryString, {encoding: 'utf8'});


var fs = require('fs-extra');
var path = require('path');
var pkg = require('./package.json');

import config from './rollup.config';

config.entry = 'lib/custom.js';
config.format = 'umd';
config.dest = 'dist/custom/jsonld.js';

config.outro = '';
config.footer = '';

/*
config.outro = [
  config.outro || '',
  fs.readFileSync(path.join('./lib/outro.browser.js'))
].join('\n');

config.footer = [
  config.footer || '',
  'window.jsonldjs = window.jsonld;',
  'window.jsonld.version = \'' + pkg.version + '\';'
].join('\n');
//*/

config.plugins = [
  includePaths({
    include: {
      './NormalizeHashDOT_init.js': './lib/NormalizeHashDOT_init.browser.js',
      'superagent-cache': './lib/placeholder.js',
      'cache-service-cache-module': './lib/placeholder.js',
    },
    paths: ['lib'],
    external: [],
    extensions: ['.js', '.json', '.html']
  }),
  nodeResolve({
    jsnext: true,
    main: true,
    browser: true
  }),
  commonjs({
    include: [
      'node_modules/**'
    ]
  }),
  uglify(),
  babel({
    exclude: 'node_modules/**'
  }),
];

export default config;
