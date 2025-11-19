/**
 * Karma configuration for jsonld.js.
 *
 * See ./test/test.js for env options.
 *
 * @author Dave Longley
 * @author David I. Lehn
 *
 * Copyright (c) 2011-2023 Digital Bazaar, Inc. All rights reserved.
 */
const os = require('os');
const webpack = require('webpack');
const {TestServer} = require('./tests/test-server.js');

// karma test server proxy details
const _proxyTestsPrefix = '/tests';

let testServer;

// shutdown test server "reporter" hook
function ShutdownTestServer(baseReporterDecorator) {
  baseReporterDecorator(this);

  this.onRunComplete = async function() {
    await testServer.close();
  };
}

// Inject the base reporter
ShutdownTestServer.$inject = ['baseReporterDecorator', 'config'];

// local "reporter" plugin
const shutdownTestServer = {
  'reporter:shutdown-test-server': ['type', ShutdownTestServer]
};

module.exports = async function(config) {
  testServer = new TestServer({
    earlFilename: process.env.EARL
  });
  await testServer.start();

  // bundler to test: webpack, browserify
  const bundler = process.env.BUNDLER || 'webpack';

  const frameworks = ['mocha'];
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
    exclude: [],

    // preprocess matching files before serving them to the browser
    // available preprocessors:
    // https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      //'tests/*.js': ['webpack', 'babel'] //preprocessors
      'tests/*.js': preprocessors
    },

    webpack: {
      mode: 'development',
      devtool: 'inline-source-map',
      plugins: [
        new webpack.DefinePlugin({
          'process.env.BAIL': JSON.stringify(process.env.BAIL),
          'process.env.BENCHMARK': JSON.stringify(process.env.BENCHMARK),
          'process.env.EARL': JSON.stringify(process.env.EARL),
          'process.env.TESTS': JSON.stringify(process.env.TESTS),
          'process.env.TEST_ENV': JSON.stringify(process.env.TEST_ENV),
          'process.env.TEST_SERVER_URL': JSON.stringify(_proxyTestsPrefix),
          'process.env.AUTH_TOKEN': JSON.stringify(testServer.authToken),
          'process.env.VERBOSE_SKIP': JSON.stringify(process.env.VERBOSE_SKIP),
          // for 'auto' test env
          'process.env._TEST_ENV_ARCH': JSON.stringify(process.arch),
          'process.env._TEST_ENV_CPU': JSON.stringify(os.cpus()[0].model),
          'process.env._TEST_ENV_CPU_COUNT': JSON.stringify(os.cpus().length),
          'process.env._TEST_ENV_PLATFORM': JSON.stringify(process.platform),
          'process.env._TEST_VERSION':
            JSON.stringify(require('./package.json').version)
        })
      ],
      module: {
        rules: [
          {
            test: /\.js$/,
            // avoid processing core-js
            include: {
              and: [/node_modules/],
              not: [/core-js/]
            },
            use: {
              loader: 'babel-loader',
              options: {
                presets: [
                  [
                    '@babel/preset-env',
                    {
                      useBuiltIns: 'usage',
                      corejs: '3.47',
                      bugfixes: true,
                      //debug: true,
                      targets: {
                        // test with slightly looser browserslist defaults
                        browsers: 'defaults, > 0.25%, not IE 11'
                      }
                    }
                  ]
                ],
                plugins: [
                  '@babel/plugin-transform-modules-commonjs',
                  '@babel/plugin-transform-runtime'
                ]
              }
            }
          }
        ],
        //noParse: [
        //  // avoid munging internal benchmark script magic
        //  /benchmark/
        //]
      },
      output: {
        globalObject: 'this'
      }
    },

    browserify: {
      debug: false,
      transform: [
        //'uglifyify',
        [
          'envify', {
            BAIL: process.env.BAIL,
            BENCHMARK: process.env.BENCHMARK,
            EARL: process.env.EARL,
            TESTS: process.env.TESTS,
            TEST_ENV: process.env.TEST_ENV,
            TEST_SERVER_URL: _proxyTestsPrefix,
            AUTH_TOKEN: testServer.authToken,
            VERBOSE_SKIP: process.env.VERBOSE_SKIP,
            // for 'auto' test env
            _TEST_ENV_ARCH: process.arch,
            _TEST_ENV_CPU: os.cpus()[0].model,
            _TEST_ENV_CPU_COUNT: os.cpus().length,
            _TEST_ENV_PLATFORM: process.platform,
            _TEST_VERSION: require('./package.json').version
          }
        ]
      ],
      plugin: [
        [
          require('esmify')
        ]
      ]
    },

    // local server shutdown plugin
    plugins: [
      'karma-*',
      shutdownTestServer
    ],

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    //reporters: ['progress'],
    reporters: [
      'mocha',
      'shutdown-test-server'
    ],

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
    proxies: {
      '/tests': testServer.url
    }
  });
};
