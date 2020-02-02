/**
 * Karma test runner for jsonld.js.
 *
 * Use environment vars to control, set via karma.conf.js/webpack:
 *
 * Set dirs, manifests, or js to run:
 *   JSONLD_TESTS="r1 r2 ..."
 * Output an EARL report:
 *   EARL=filename
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
 * Copyright (c) 2011-2017 Digital Bazaar, Inc. All rights reserved.
 */
/* global serverRequire */
// FIXME: hack to ensure delay is set first
mocha.setup({delay: true, ui: 'bdd'});

// test suite compatibility
require('core-js/features/string/ends-with');
require('core-js/features/string/starts-with');

// jsonld compatibility
require('core-js/features/array/from');
require('core-js/features/array/includes');
require('core-js/features/map');
require('core-js/features/object/assign');
require('core-js/features/promise');
require('core-js/features/set');
require('core-js/features/symbol');

const assert = require('chai').assert;
const common = require('./test-common');
const jsonld = require('..');
const server = require('karma-server-side');
const webidl = require('./test-webidl');
const join = require('join-path-js');

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
  entries.push(join(_top, 'tests/new-embed-api'));

  // WebIDL tests
  entries.push(webidl);
}

let benchmark = null;
if(process.env.JSONLD_BENCHMARK) {
  benchmark = {};
  if(!(['1', 'true'].includes(process.env.JSONLD_BENCHMARK))) {
    process.env.JSONLD_BENCHMARK.split(',').forEach(pair => {
      const kv = pair.split('=');
      benchmark[kv[0]] = kv[1];
    });
  }
}

const options = {
  nodejs: false,
  assert,
  jsonld,
  /* eslint-disable-next-line no-unused-vars */
  exit: code => {
    console.error('exit not implemented');
    throw new Error('exit not implemented');
  },
  earl: {
    id: 'browser',
    filename: process.env.EARL
  },
  verboseSkip: process.env.VERBOSE_SKIP === 'true',
  bailOnError: process.env.BAIL === 'true',
  entries,
  benchmark,
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
