/**
 * Node.js test runner for jsonld.js.
 *
 * See ./test.js for environment vars options.
 *
 * @author Dave Longley
 * @author David I. Lehn
 *
 * Copyright (c) 2011-2025 Digital Bazaar, Inc. All rights reserved.
 */
const assert = require('chai').assert;
const benchmark = require('benchmark');
const common = require('./test.js');
const os = require('os');
const path = require('path');
const {TestServer} = require('./test-server.js');

// local HTTP test server
let testServer;

const entries = [];
const allowedImports = [];

async function init({testServer}) {
  if(process.env.TESTS) {
    entries.push(...process.env.TESTS.split(' '));
    return;
  }
  entries.push(new URL('/tests/default/', testServer.url));

  // other tests
  // setup allow list
  const _tests = path.resolve(__dirname);
  allowedImports.push(path.resolve(_tests, 'misc.js'));
  allowedImports.push(path.resolve(_tests, 'graph-container.js'));
  allowedImports.push(path.resolve(_tests, 'node-document-loader-tests.js'));
  // add all allow list entries
  entries.push(...allowedImports);
}

// test environment defaults
const testEnvDefaults = {
  label: '',
  arch: process.arch,
  cpu: os.cpus()[0].model,
  cpuCount: os.cpus().length,
  platform: process.platform,
  runtime: 'Node.js',
  runtimeVersion: process.version,
  comment: '',
  version: require('../package.json').version
};

const env = {
  BAIL: process.env.BAIL,
  BENCHMARK: process.env.BENCHMARK,
  TEST_ENV: process.env.TEST_ENV,
  VERBOSE_SKIP: process.env.VERBOSE_SKIP
};

const options = {
  env,
  nodejs: {
    path
  },
  assert,
  benchmark,
  exit: code => process.exit(code),
  earl: {
    enabled: !!process.env.EARL,
    filename: process.env.EARL
  },
  entries,
  addExtraTests: async () => {},
  testEnvDefaults,
  get testServerUrl() {
    return testServer.url;
  },
  get authToken() {
    return testServer.authToken;
  },
  import: f => {
    if(!allowedImports.includes(f)) {
      throw new Error(`Import not allowed: "${f}"`);
    }
    return require(f);
  },
  cleanup: async () => {
    await testServer.close();
  }
};

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
});

async function main() {
  // start test server
  testServer = new TestServer({
    earlFilename: process.env.EARL
  });
  await testServer.start();

  await init({
    testServer
  });

  // wait for setup of all tests then run mocha
  await common.setup(options);
  run();

  // FIXME: run returns before tests are complete
  //await testServer.close();
}

main().catch(async err => {
  console.error(err);
  // close server so mocha can cleanly shutdown
  await options.cleanup();
});
