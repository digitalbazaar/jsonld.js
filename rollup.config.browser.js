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

/*
config.external = [
  'superagent-cache',
  'cache-service-cache-module',
  'xmldom'
];

config.globals = {
  'superagent-cache': 'superagentCache',
  'cache-service-cache-module': 'Cache'
};
//*/

config.footer = [
  config.footer || '',
  'window.jsonldjs = window.jsonld;',
  'window.jsonld.version = \'' + pkg.version + '\';'
].join('\n');

config.plugins = [
  includePaths({
    include: {
      './NormalizeHashDOT_init.js': './lib/NormalizeHashDOT_init.browser.js',
      'superagent-cache': './lib/placeholder.js',
      'cache-service-cache-module': './lib/placeholder.js',
    },
    paths: ['lib'],
/*
    external: [
      'superagent-cache',
      'cache-service-cache-module',
      'xmldom'
    ],
//*/
    extensions: ['.js', '.json', '.html']
  }),
  nodeResolve({
    jsnext: true,
    main: true,
    browser: true,
/*
    skip: [
      './node_modules/cache-service-cache-module/**',
      './node_modules/superagent-cache/**',
      'superagent-cache',
      'cache-service-cache-module',
      'xmldom'
    ]
//*/
  }),
  commonjs({
    include: [
      'node_modules/**'
    ],
/*
    exclude: [
      './node_modules/cache-service-cache-module/**',
      './node_modules/superagent-cache/**',
      './node_modules/xmldom/**',
    ]
//*/
  }),
  uglify(),
  babel({
    exclude: 'node_modules/**'
  }),
];

export default config;
