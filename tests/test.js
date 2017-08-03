/**
 * Node.js test runner for jsonld.js.
 *
 * Use environment vars to control:
 *
 * Set dirs, manifests, or js to run:
 *   JSONLD_TESTS="r1 r2 ..."
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
const assert = require('chai').assert;
const common = require('./test-common');
const fs = require('fs-extra');
const jsonld = require('..');
const path = require('path');

const entries = [];

if(process.env.JSONLD_TESTS) {
  entries.push(...process.env.JSONLD_TESTS.split(' '));
} else {
  const _top = path.resolve(__dirname, '..');

  // json-ld.org main test suite
  const orgPath = path.resolve(_top, 'test-suites/json-ld.org/test-suite');
  if(fs.existsSync(orgPath)) {
    entries.push(orgPath);
  } else {
    // default to sibling dir
    entries.push(path.resolve(_top, '../json-ld.org/test-suite'));
  }

  // json-ld.org normalization test suite
  const normPath = path.resolve(_top, 'test-suites/normalization/tests');
  if(fs.existsSync(normPath)) {
    entries.push(normPath);
  } else {
    // default up to sibling dir
    entries.push(path.resolve(_top, '../normalization/tests'));
  }

  // other tests
  entries.push(path.resolve(_top, 'tests/new-embed-api'));
  entries.push(path.resolve(_top, 'test/node-document-loader-tests.js'));
}

const options = {
  nodejs: {
    path: path
  },
  assert: assert,
  jsonld: jsonld,
  exit: code => process.exit(code),
  earl: {
    id: 'node.js',
    filename: process.env.EARL
  },
  bailOnError: !!process.env.BAIL,
  entries: entries,
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
