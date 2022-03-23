/**
 * Node.js test runner for jsonld.js.
 *
 * Use environment vars to control:
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
 *   - label - ex: 'Setup 1' (short label for reports)
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
const assert = require('chai').assert;
const benchmark = require('benchmark');
const common = require('./test-common');
const fs = require('fs-extra');
const jsonld = require('..');
const os = require('os');
const path = require('path');

const entries = [];

if(process.env.JSONLD_TESTS) {
  entries.push(...process.env.JSONLD_TESTS.split(' '));
} else {
  const _top = path.resolve(__dirname, '..');

  // json-ld-api main test suite
  const apiPath = path.resolve(_top, 'test-suites/json-ld-api/tests');
  if(fs.existsSync(apiPath)) {
    entries.push(apiPath);
  } else {
    // default to sibling dir
    entries.push(path.resolve(_top, '../json-ld-api/tests'));
  }

  // json-ld-framing main test suite
  const framingPath = path.resolve(_top, 'test-suites/json-ld-framing/tests');
  if(fs.existsSync(framingPath)) {
    entries.push(framingPath);
  } else {
    // default to sibling dir
    entries.push(path.resolve(_top, '../json-ld-framing/tests'));
  }

  /*
  // TODO: use json-ld-framing once tests are moved
  // json-ld.org framing test suite
  const framingPath = path.resolve(
    _top, 'test-suites/json-ld.org/test-suite/tests/frame-manifest.jsonld');
  if(fs.existsSync(framingPath)) {
    entries.push(framingPath);
  } else {
    // default to sibling dir
    entries.push(path.resolve(
      _top, '../json-ld.org/test-suite/tests/frame-manifest.jsonld'));
  }
  */

  // json-ld.org normalization test suite
  const normPath = path.resolve(_top, 'test-suites/normalization/tests');
  if(fs.existsSync(normPath)) {
    entries.push(normPath);
  } else {
    // default up to sibling dir
    entries.push(path.resolve(_top, '../normalization/tests'));
  }

  // other tests
  entries.push(path.resolve(_top, 'tests/misc.js'));
  entries.push(path.resolve(_top, 'tests/graph-container.js'));
  entries.push(path.resolve(_top, 'tests/node-document-loader-tests.js'));
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
        testEnv.name = 'auto';
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
    if(testEnv.label === 'auto') {
      testEnv.label = '';
    }
    if(testEnv.arch === 'auto') {
      testEnv.arch = process.arch;
    }
    if(testEnv.cpu === 'auto') {
      testEnv.cpu = os.cpus()[0].model;
    }
    if(testEnv.cpuCount === 'auto') {
      testEnv.cpuCount = os.cpus().length;
    }
    if(testEnv.platform === 'auto') {
      testEnv.platform = process.platform;
    }
    if(testEnv.runtime === 'auto') {
      testEnv.runtime = 'Node.js';
    }
    if(testEnv.runtimeVersion === 'auto') {
      testEnv.runtimeVersion = process.version;
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
  nodejs: {
    path
  },
  assert,
  benchmark,
  jsonld,
  exit: code => process.exit(code),
  earl: {
    filename: process.env.EARL
  },
  verboseSkip: process.env.VERBOSE_SKIP === 'true',
  bailOnError: process.env.BAIL === 'true',
  entries,
  testEnv,
  benchmarkOptions,
  readFile: filename => {
    return fs.readFile(filename, 'utf8');
  },
  writeFile: (filename, data) => {
    return fs.outputFile(filename, data);
  },
  import: f => require(f)
};

// wait for setup of all tests then run mocha
common(options).then(() => {
  run();
}).catch(err => {
  console.error(err);
});

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
});
