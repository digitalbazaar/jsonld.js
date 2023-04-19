/**
 * Karma test runner for jsonld.js.
 *
 * See ./test.js for environment vars options.
 *
 * @author Dave Longley
 * @author David I. Lehn
 *
 * Copyright (c) 2011-2023 Digital Bazaar, Inc. All rights reserved.
 */
/* global serverRequire */
// FIXME: hack to ensure delay is set first
mocha.setup({delay: true, ui: 'bdd'});

const assert = require('chai').assert;
const benchmark = require('benchmark');
const common = require('./test.js');
const server = require('karma-server-side');
const webidl = require('./test-webidl');
const join = require('join-path-js');

// special benchmark setup
const _ = require('lodash');
const Benchmark = benchmark.runInContext({_});
window.Benchmark = Benchmark;

const entries = [];

if(process.env.TESTS) {
  entries.push(...process.env.TESTS.split(' '));
} else {
  const _top = process.env.TEST_ROOT_DIR;
  // TODO: support just adding certain entries in EARL mode?

  // json-ld-api main test suite
  entries.push((async () => {
    const testPath = join(_top, 'test-suites/json-ld-api/tests');
    const siblingPath = join(_top, '../json-ld-api/tests');
    return server.run(testPath, siblingPath, function(testPath, siblingPath) {
      const fs = serverRequire('fs-extra');
      // use local tests if setup
      if(fs.existsSync(testPath)) {
        return testPath;
      }
      // default to sibling dir
      return siblingPath;
    });
  })());

  // json-ld-framing main test suite
  entries.push((async () => {
    const testPath = join(_top, 'test-suites/json-ld-framing/tests');
    const siblingPath = join(_top, '../json-ld-framing/tests');
    return server.run(testPath, siblingPath, function(testPath, siblingPath) {
      const fs = serverRequire('fs-extra');
      // use local tests if setup
      if(fs.existsSync(testPath)) {
        return testPath;
      }
      // default to sibling dir
      return siblingPath;
    });
  })());

  /*
  // TODO: use json-ld-framing once tests are moved
  // json-ld.org framing test suite
  // FIXME: add path detection
  entries.push(join(
    _top, 'test-suites/json-ld.org/test-suite/tests/frame-manifest.jsonld'));
  entries.push(join(
    _top, '../json-ld.org/test-suite/tests/frame-manifests.jsonld'));
  */

  // W3C RDF Dataset Canonicalization "rdf-canon" test suite
  entries.push((async () => {
    const testPath = join(_top, 'test-suites/rdf-canon/tests');
    const siblingPath = join(_top, '../rdf-canon/tests');
    return server.run(testPath, siblingPath, function(testPath, siblingPath) {
      const fs = serverRequire('fs-extra');
      // use local tests if setup
      if(fs.existsSync(testPath)) {
        return testPath;
      }
      // default to sibling dir
      return siblingPath;
    });
  })());

  // other tests
  entries.push(join(_top, 'tests/misc.js'));
  entries.push(join(_top, 'tests/graph-container.js'));

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
    filename: process.env.EARL
  },
  entries,
  testEnvDefaults,
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
    console.error('import not implemented for "' + f + '"');
  }
};

// wait for setup of all tests then run mocha
common(options).then(() => {
  run();
}).catch(err => {
  console.error(err);
});
