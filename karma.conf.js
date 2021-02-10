/**
 * Karam configuration for jsonld.js.
 *
 * Set dirs, manifests, or js to run:
 *   JSONLD_TESTS="f1 f2 ..."
 * Output an EARL report:
 *   EARL=filename
 * Bail with tests fail:
 *   BAIL=true
 *
 * @author Dave Longley
 * @author David I. Lehn
 *
 * Copyright (c) 2011-2017 Digital Bazaar, Inc. All rights reserved.
 */
const webpack = require('webpack');

module.exports = function(config) {
  // bundler to test: webpack, browserify
  const bundler = process.env.BUNDLER || 'webpack';

  const frameworks = ['mocha', 'server-side'];
  // main bundle preprocessors
  const preprocessors = ['babel'];

  if(bundler === 'browserify') {
    frameworks.push(bundler);
    preprocessors.push(bundler);
  } else if(bundler === 'webpack') {
    preprocessors.push(bundler);
    preprocessors.push('sourcemap');
  } else {
    throw Error('Unknown bundler');
  }

  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks,

    // list of files / patterns to load in the browser
    files: [
      {
        pattern: 'tests/test-karma.js',
        watched: false, served: true, included: true
      }
    ],

    // list of files to exclude
    exclude: [
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors:
    // https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      //'tests/*.js': ['webpack', 'babel'] //preprocessors
      'tests/*.js': preprocessors
    },

    webpack: {
      mode: 'production',
      devtool: 'inline-source-map',
      plugins: [
        new webpack.DefinePlugin({
          'process.env.BAIL': JSON.stringify(process.env.BAIL),
          'process.env.EARL': JSON.stringify(process.env.EARL),
          'process.env.JSONLD_BENCHMARK':
            JSON.stringify(process.env.JSONLD_BENCHMARK),
          'process.env.JSONLD_TESTS': JSON.stringify(process.env.JSONLD_TESTS),
          'process.env.TEST_ROOT_DIR': JSON.stringify(__dirname),
          'process.env.VERBOSE_SKIP': JSON.stringify(process.env.VERBOSE_SKIP)
        })
      ],
      module: {
        rules: [
          {
            test: /\.js$/,
            include: [{
              // exclude node_modules by default
              exclude: /(node_modules)/
            }, {
              // include specific packages
              include: [
                /(node_modules\/canonicalize)/,
                /(node_modules\/lru-cache)/,
                /(node_modules\/rdf-canonize)/
              ]
            }],
            use: {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env'],
                plugins: [
                  [
                    '@babel/plugin-proposal-object-rest-spread',
                    {useBuiltIns: true}
                  ],
                  '@babel/plugin-transform-modules-commonjs',
                  '@babel/plugin-transform-runtime'
                ]
              }
            }
          }
        ]
      },
      node: {
        Buffer: false,
        process: false,
        crypto: false,
        setImmediate: false
      }
    },

    browserify: {
      debug: true
      //transform: ['uglifyify']
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    //reporters: ['progress'],
    reporters: ['mocha'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR ||
    // config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file
    // changes
    autoWatch: false,

    // start these browsers
    // available browser launchers:
    // https://npmjs.org/browse/keyword/karma-launcher
    //browsers: ['ChromeHeadless', 'Chrome', 'Firefox', 'Safari'],
    browsers: ['ChromeHeadless'],

    customLaunchers: {
      IE9: {
        base: 'IE',
        'x-ua-compatible': 'IE=EmulateIE9'
      },
      IE8: {
        base: 'IE',
        'x-ua-compatible': 'IE=EmulateIE8'
      }
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity,

    // Mocha
    client: {
      mocha: {
        // increase from default 2s
        timeout: 10000,
        reporter: 'html',
        delay: true
      }
    },

    // Proxied paths
    proxies: {}
  });
};
