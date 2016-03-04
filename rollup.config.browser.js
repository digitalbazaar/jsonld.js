import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';

var fs = require('fs-extra');
var path = require('path');
var pkg = require('./package.json');

import config from './rollup.config';

config.format = 'umd';
config.dest = 'dist/browser/jsonld.js';

config.outro = [
  config.outro || '',
  fs.readFileSync(path.join('./js/outro.browser.js'))
].join('\n');

config.footer = [
  config.footer || '',
  'window.jsonldjs = window.jsonld;',
  'window.jsonld.version = \'' + pkg.version + '\';'
].join('\n');

config.plugins = [
  nodeResolve({
    jsnext: true,
    main: true,
    browser: true
  }),
  commonjs({
    include: ['node_modules/**']
  }),
  babel({
    exclude: 'node_modules/**'
  }),
];

export default config;
