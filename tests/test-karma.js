/**
 * Karma test runner for jsonld.js.
 *
 * See ./test.js for environment vars options.
 *
 * @author Dave Longley
 * @author David I. Lehn
 *
 * Copyright (c) 2011-2025 Digital Bazaar, Inc. All rights reserved.
 */
// FIXME: hack to ensure delay is set first
mocha.setup({delay: true, ui: 'bdd'});

const assert = require('chai').assert;
const benchmark = require('benchmark');
const common = require('./test.js');
const webidl = require('./test-webidl');

// special benchmark setup
const _ = require('lodash');
const Benchmark = benchmark.runInContext({_});
window.Benchmark = Benchmark;

const entries = [];

// setup test server url, add localhost if needed
let testServerUrl = process.env.TEST_SERVER_URL;
if(!testServerUrl.endsWith('/')) {
  testServerUrl += '/';
}
if(!(testServerUrl.startsWith('http:') || testServerUrl.startsWith('https:'))) {
  const pathname = testServerUrl;
  testServerUrl = new URL(window.location);
  testServerUrl.pathname = pathname;
}

if(process.env.TESTS) {
  entries.push(...process.env.TESTS.split(' '));
} else {
  entries.push(new URL('tests/default/', testServerUrl));

  // TODO: support just adding certain entries in EARL mode?

  // other tests (including js ones) added with options.addExtraTests

  // WebIDL tests
  entries.push(webidl);
}

// test environment defaults
const testEnvDefaults = {
  label: '',
  arch: process.env._TEST_ENV_ARCH,
  cpu: process.env._TEST_ENV_CPU,
  cpuCount: process.env._TEST_ENV_CPU_COUNT,
  platform: process.env._TEST_ENV_PLATFORM,
  runtime: 'browser',
  runtimeVersion: '(unknown)',
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
  nodejs: false,
  assert,
  benchmark,
  /* eslint-disable-next-line no-unused-vars */
  exit: code => {
    console.error('exit not implemented');
    throw new Error('exit not implemented');
  },
  earl: {
    enabled: !!process.env.EARL,
    filename: process.env.EARL
  },
  entries,
  addExtraTests: async () => {
    // direct load for bundling
    // called after handling other entry loading
    require('./misc.js');
    require('./graph-container.js');
  },
  testEnvDefaults,
  get testServerUrl() {
    return testServerUrl;
  },
  get authToken() {
    return process.env.AUTH_TOKEN;
  },
  import: f => {
    console.error('import not implemented for "' + f + '"');
  },
  cleanup: async () => {}
};

async function main() {
  // wait for setup of all tests then run mocha
  await common.setup(options);
  run();
}

main().catch(err => {
  console.error(err);
});
