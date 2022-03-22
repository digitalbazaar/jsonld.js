/**
 * Karma test runner for jsonld.js.
 *
 * Use environment vars to control, set via karma.conf.js/webpack:
 *
 * Set dirs, manifests, or js to run:
 *   JSONLD_TESTS="r1 r2 ..."
 * Output an EARL report:
 *   EARL=filename
 * Test environment details for EARL report:
 *   This is useful for benchmark comparison.
 *   By default no details are added for privacy reasons.
 *   Automatic details can be added for all fields with '1', 'true', or 'auto':
 *   TEST_ENV=1
 *   To include only certain fields, set them, or use 'auto':
 *   TEST_ENV=cpu='Intel i7-4790K @ 4.00GHz',runtime='Node.js',...
 *   TEST_ENV=cpu=auto # only cpu
 *   TEST_ENV=cpu,runtime # only cpu and runtime
 *   TEST_ENV=auto,comment='special test' # all auto with override
 *   Available fields:
 *   - arch - ex: 'x64'
 *   - cpu - ex: 'Intel(R) Core(TM) i7-4790K CPU @ 4.00GHz'
 *   - cpuCount - ex: 8
 *   - platform - ex: 'linux'
 *   - runtime - ex: 'Node.js'
 *   - runtimeVersion - ex: 'v14.19.0'
 *   - comment: any text
 *   - version: jsonld.js version
 * Bail with tests fail:
 *   BAIL=true
 * Verbose skip reasons:
 *   VERBOSE_SKIP=true
 * Benchmark mode:
 *   Basic:
 *   JSONLD_BENCHMARK=1
 *   With options:
 *   JSONLD_BENCHMARK=key1=value1,key2=value2,...
 *
 * @author Dave Longley
 * @author David I. Lehn
 *
 * Copyright (c) 2011-2022 Digital Bazaar, Inc. All rights reserved.
 */
/* global serverRequire */
// FIXME: hack to ensure delay is set first
mocha.setup({delay: true, ui: 'bdd'});

const assert = require('chai').assert;
const common = require('./test-common');
const jsonld = require('..');
const server = require('karma-server-side');
const webidl = require('./test-webidl');
const join = require('join-path-js');

// special benchmark setup
const _ = require('lodash');
//const _process = require('process');
const benchmark = require('benchmark');
//const Benchmark = benchmark.runInContext({_, _process});
const Benchmark = benchmark.runInContext({_});
window.Benchmark = Benchmark;

const entries = [];

if(process.env.JSONLD_TESTS) {
  entries.push(...process.env.JSONLD_TESTS.split(' '));
} else {
  const _top = process.env.TEST_ROOT_DIR;
  // TODO: support just adding certain entries in EARL mode?

  // json-ld-api main test suite
  // FIXME: add path detection
  entries.push(join(_top, 'test-suites/json-ld-api/tests'));
  entries.push(join(_top, '../json-ld-api/tests'));

  // json-ld-framing main test suite
  // FIXME: add path detection
  entries.push(join(_top, 'test-suites/json-ld-framing/tests'));
  entries.push(join(_top, '../json-ld-framing/tests'));

  /*
  // TODO: use json-ld-framing once tests are moved
  // json-ld.org framing test suite
  // FIXME: add path detection
  entries.push(join(
    _top, 'test-suites/json-ld.org/test-suite/tests/frame-manifest.jsonld'));
  entries.push(join(
    _top, '../json-ld.org/test-suite/tests/frame-manifests.jsonld'));
  */

  // json-ld.org normalization test suite
  // FIXME: add path detection
  entries.push(join(_top, 'test-suites/normalization/tests'));
  entries.push(join(_top, '../normalization/tests'));

  // other tests
  entries.push(join(_top, 'tests/misc.js'));
  entries.push(join(_top, 'tests/graph-container.js'));
  entries.push(join(_top, 'tests/new-embed-api'));

  // WebIDL tests
  entries.push(webidl);
}

// test environment
let testEnv = null;
if(process.env.TEST_ENV) {
  let _test_env = process.env.TEST_ENV;
  if(!(['0', 'false'].includes(_test_env))) {
    testEnv = {};
    if(['1', 'true', 'auto'].includes(_test_env)) {
      _test_env = 'auto';
    }
    _test_env.split(',').forEach(pair => {
      if(pair === 'auto') {
        testEnv.arch = 'auto';
        testEnv.cpu = 'auto';
        testEnv.cpuCount = 'auto';
        testEnv.platform = 'auto';
        testEnv.runtime = 'auto';
        testEnv.runtimeVersion = 'auto';
        testEnv.comment = 'auto';
        testEnv.version = 'auto';
      } else {
        const kv = pair.split('=');
        if(kv.length === 1) {
          testEnv[kv[0]] = 'auto';
        } else {
          testEnv[kv[0]] = kv.slice(1).join('=');
        }
      }
    });
    if(testEnv.arch === 'auto') {
      testEnv.arch = process.env._TEST_ENV_ARCH;
    }
    if(testEnv.cpu === 'auto') {
      testEnv.cpu = process.env._TEST_ENV_CPU;
    }
    if(testEnv.cpuCount === 'auto') {
      testEnv.cpuCount = process.env._TEST_ENV_CPU_COUNT;
    }
    if(testEnv.platform === 'auto') {
      testEnv.platform = process.env._TEST_ENV_PLATFORM;
    }
    if(testEnv.runtime === 'auto') {
      testEnv.runtime = 'browser';
    }
    if(testEnv.runtimeVersion === 'auto') {
      testEnv.runtimeVersion = '(unknown)';
    }
    if(testEnv.comment === 'auto') {
      testEnv.comment = '';
    }
    if(testEnv.version === 'auto') {
      testEnv.version = require('../package.json').version;
    }
  }
}

let benchmarkOptions = null;
if(process.env.JSONLD_BENCHMARK) {
  if(!(['0', 'false'].includes(process.env.JSONLD_BENCHMARK))) {
    benchmarkOptions = {};
    if(!(['1', 'true'].includes(process.env.JSONLD_BENCHMARK))) {
      process.env.JSONLD_BENCHMARK.split(',').forEach(pair => {
        const kv = pair.split('=');
        benchmarkOptions[kv[0]] = kv[1];
      });
    }
  }
}

const options = {
  nodejs: false,
  assert,
  benchmark,
  jsonld,
  /* eslint-disable-next-line no-unused-vars */
  exit: code => {
    console.error('exit not implemented');
    throw new Error('exit not implemented');
  },
  earl: {
    filename: process.env.EARL
  },
  verboseSkip: process.env.VERBOSE_SKIP === 'true',
  bailOnError: process.env.BAIL === 'true',
  entries,
  testEnv,
  benchmarkOptions,
  readFile: filename => {
    return server.run(filename, function(filename) {
      const fs = serverRequire('fs-extra');
      return fs.readFile(filename, 'utf8').then(data => {
        return data;
      });
    });
  },
  writeFile: (filename, data) => {
    return server.run(filename, data, function(filename, data) {
      const fs = serverRequire('fs-extra');
      return fs.outputFile(filename, data);
    });
  },
  /* eslint-disable-next-line no-unused-vars */
  import: f => {
    console.error('import not implemented');
  }
};

// wait for setup of all tests then run mocha
common(options).then(() => {
  run();
}).catch(err => {
  console.error(err);
});
