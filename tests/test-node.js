/**
 * Node.js test runner for jsonld.js.
 *
 * See ./test.js for environment vars options.
 *
 * @author Dave Longley
 * @author David I. Lehn
 *
 * Copyright (c) 2011-2023 Digital Bazaar, Inc. All rights reserved.
 */
const assert = require('chai').assert;
const benchmark = require('benchmark');
const common = require('./test.js');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const entries = [];

if(process.env.TESTS) {
  entries.push(...process.env.TESTS.split(' '));
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

  // W3C RDF Dataset Canonicalization "rdf-canon" test suite
  const rdfCanonPath = path.resolve(_top, 'test-suites/rdf-canon/tests');
  if(fs.existsSync(rdfCanonPath)) {
    entries.push(rdfCanonPath);
  } else {
    // default to sibling dir
    entries.push(path.resolve(_top, '../rdf-canon/tests'));
  }

  // other tests
  entries.push(path.resolve(_top, 'tests/misc.js'));
  entries.push(path.resolve(_top, 'tests/graph-container.js'));
  entries.push(path.resolve(_top, 'tests/node-document-loader-tests.js'));
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
    filename: process.env.EARL
  },
  entries,
  testEnvDefaults,
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
