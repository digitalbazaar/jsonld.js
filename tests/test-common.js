/**
 * Copyright (c) 2011-2019 Digital Bazaar, Inc. All rights reserved.
 */
/* eslint-disable indent */
const EarlReport = require('./earl-report');
const benchmark = require('benchmark');
const join = require('join-path-js');
const rdfCanonize = require('rdf-canonize');
const {prependBase} = require('../lib/url');

module.exports = function(options) {

'use strict';

const assert = options.assert;
const jsonld = options.jsonld;

const manifest = options.manifest || {
  '@context': 'https://json-ld.org/test-suite/context.jsonld',
  '@id': '',
  '@type': 'mf:Manifest',
  description: 'Top level jsonld.js manifest',
  name: 'jsonld.js',
  sequence: options.entries || [],
  filename: '/'
};

const TEST_TYPES = {
  'jld:CompactTest': {
    skip: {
      // skip tests where behavior changed for a 1.1 processor
      // see JSON-LD 1.0 Errata
      specVersion: ['json-ld-1.0'],
      // FIXME
      // NOTE: idRegex format:
      //MMM-manifest.jsonld#tNNN$/,
      idRegex: [
        // html
        /html-manifest.jsonld#tc001$/,
        /html-manifest.jsonld#tc002$/,
        /html-manifest.jsonld#tc003$/,
        /html-manifest.jsonld#tc004$/,
      ]
    },
    fn: 'compact',
    params: [
      readTestUrl('input'),
      readTestJson('context'),
      createTestOptions()
    ],
    compare: compareExpectedJson
  },
  'jld:ExpandTest': {
    skip: {
      // skip tests where behavior changed for a 1.1 processor
      // see JSON-LD 1.0 Errata
      specVersion: ['json-ld-1.0'],
      // FIXME
      // NOTE: idRegex format:
      //MMM-manifest.jsonld#tNNN$/,
      idRegex: [
        // html
        /html-manifest.jsonld#te001$/,
        /html-manifest.jsonld#te002$/,
        /html-manifest.jsonld#te003$/,
        /html-manifest.jsonld#te004$/,
        /html-manifest.jsonld#te005$/,
        /html-manifest.jsonld#te006$/,
        /html-manifest.jsonld#te007$/,
        /html-manifest.jsonld#te010$/,
        /html-manifest.jsonld#te011$/,
        /html-manifest.jsonld#te012$/,
        /html-manifest.jsonld#te013$/,
        /html-manifest.jsonld#te014$/,
        /html-manifest.jsonld#te015$/,
        /html-manifest.jsonld#te016$/,
        /html-manifest.jsonld#te017$/,
        /html-manifest.jsonld#te018$/,
        /html-manifest.jsonld#te019$/,
        /html-manifest.jsonld#te020$/,
        /html-manifest.jsonld#te021$/,
        /html-manifest.jsonld#te022$/,
        /html-manifest.jsonld#tex01$/,
        // HTML extraction
        /expand-manifest.jsonld#thc01$/,
        /expand-manifest.jsonld#thc02$/,
        /expand-manifest.jsonld#thc03$/,
        /expand-manifest.jsonld#thc04$/,
        /expand-manifest.jsonld#thc05$/,
        // remote
        /remote-doc-manifest.jsonld#t0013$/, // HTML
      ]
    },
    fn: 'expand',
    params: [
      readTestUrl('input'),
      createTestOptions()
    ],
    compare: compareExpectedJson
  },
  'jld:FlattenTest': {
    skip: {
      // skip tests where behavior changed for a 1.1 processor
      // see JSON-LD 1.0 Errata
      specVersion: ['json-ld-1.0'],
      // FIXME
      // NOTE: idRegex format:
      //MMM-manifest.jsonld#tNNN$/,
      idRegex: [
        // html
        /html-manifest.jsonld#tf001$/,
        /html-manifest.jsonld#tf002$/,
        /html-manifest.jsonld#tf003$/,
        /html-manifest.jsonld#tf004$/,
      ]
    },
    fn: 'flatten',
    params: [
      readTestUrl('input'),
      readTestJson('context'),
      createTestOptions()
    ],
    compare: compareExpectedJson
  },
  'jld:FrameTest': {
    skip: {
      // skip tests where behavior changed for a 1.1 processor
      // see JSON-LD 1.0 Errata
      specVersion: ['json-ld-1.0'],
      // FIXME
      // NOTE: idRegex format:
      //MMM-manifest.jsonld#tNNN$/,
      idRegex: [
      ]
    },
    fn: 'frame',
    params: [
      readTestUrl('input'),
      readTestJson('frame'),
      createTestOptions()
    ],
    compare: compareExpectedJson
  },
  'jld:FromRDFTest': {
    skip: {
      // skip tests where behavior changed for a 1.1 processor
      // see JSON-LD 1.0 Errata
      specVersion: ['json-ld-1.0'],
      // FIXME
      // NOTE: idRegex format:
      //MMM-manifest.jsonld#tNNN$/,
      idRegex: [
        // direction (compound-literal)
        /fromRdf-manifest.jsonld#tdi11$/,
        /fromRdf-manifest.jsonld#tdi12$/,
      ]
    },
    fn: 'fromRDF',
    params: [
      readTestNQuads('input'),
      createTestOptions({format: 'application/n-quads'})
    ],
    compare: compareExpectedJson
  },
  'jld:NormalizeTest': {
    fn: 'normalize',
    params: [
      readTestUrl('input'),
      createTestOptions({format: 'application/n-quads'})
    ],
    compare: compareExpectedNQuads
  },
  'jld:ToRDFTest': {
    skip: {
      // skip tests where behavior changed for a 1.1 processor
      // see JSON-LD 1.0 Errata
      specVersion: ['json-ld-1.0'],
      // FIXME
      // NOTE: idRegex format:
      //MMM-manifest.jsonld#tNNN$/,
      idRegex: [
        // well formed
        /toRdf-manifest.jsonld#twf05$/,
        // html
        /html-manifest.jsonld#tr001$/,
        /html-manifest.jsonld#tr002$/,
        /html-manifest.jsonld#tr003$/,
        /html-manifest.jsonld#tr004$/,
        /html-manifest.jsonld#tr005$/,
        /html-manifest.jsonld#tr006$/,
        /html-manifest.jsonld#tr007$/,
        /html-manifest.jsonld#tr010$/,
        /html-manifest.jsonld#tr011$/,
        /html-manifest.jsonld#tr012$/,
        /html-manifest.jsonld#tr013$/,
        /html-manifest.jsonld#tr014$/,
        /html-manifest.jsonld#tr015$/,
        /html-manifest.jsonld#tr016$/,
        /html-manifest.jsonld#tr017$/,
        /html-manifest.jsonld#tr018$/,
        /html-manifest.jsonld#tr019$/,
        /html-manifest.jsonld#tr020$/,
        /html-manifest.jsonld#tr021$/,
        /html-manifest.jsonld#tr022$/,
        // Invalid Statement
        /toRdf-manifest.jsonld#te075$/,
        /toRdf-manifest.jsonld#te111$/,
        /toRdf-manifest.jsonld#te112$/,
        // direction (compound-literal)
        /toRdf-manifest.jsonld#tdi11$/,
        /toRdf-manifest.jsonld#tdi12$/,
      ]
    },
    fn: 'toRDF',
    params: [
      readTestUrl('input'),
      createTestOptions({format: 'application/n-quads'})
    ],
    compare: compareCanonizedExpectedNQuads
  },
  'rdfn:Urgna2012EvalTest': {
    fn: 'normalize',
    params: [
      readTestNQuads('action'),
      createTestOptions({
        algorithm: 'URGNA2012',
        inputFormat: 'application/n-quads',
        format: 'application/n-quads'
      })
    ],
    compare: compareExpectedNQuads
  },
  'rdfn:Urdna2015EvalTest': {
    fn: 'normalize',
    params: [
      readTestNQuads('action'),
      createTestOptions({
        algorithm: 'URDNA2015',
        inputFormat: 'application/n-quads',
        format: 'application/n-quads'
      })
    ],
    compare: compareExpectedNQuads
  }
};

const SKIP_TESTS = [];

// create earl report
if(options.earl && options.earl.filename) {
  options.earl.report = new EarlReport({id: options.earl.id});
}

return new Promise(resolve => {

// async generated tests
// _tests => [{suite}, ...]
// suite => {
//   title: ...,
//   tests: [test, ...],
//   suites: [suite, ...]
// }
const _tests = [];

return addManifest(manifest, _tests)
  .then(() => {
    _testsToMocha(_tests);
  }).then(() => {
    if(options.earl.report) {
      describe('Writing EARL report to: ' + options.earl.filename, function() {
        it('should print the earl report', function() {
          return options.writeFile(
            options.earl.filename, options.earl.report.reportJson());
        });
      });
    }
  }).then(() => resolve());

// build mocha tests from local test structure
function _testsToMocha(tests) {
  tests.forEach(suite => {
    if(suite.skip) {
      describe.skip(suite.title);
      return;
    }
    describe(suite.title, () => {
      suite.tests.forEach(test => {
        if(test.only) {
          it.only(test.title, test.f);
          return;
        }
        it(test.title, test.f);
      });
      _testsToMocha(suite.suites);
    });
    suite.imports.forEach(f => {
      options.import(f);
    });
  });
}

});

/**
 * Adds the tests for all entries in the given manifest.
 *
 * @param manifest {Object} the manifest.
 * @param parent {Object} the parent test structure
 * @return {Promise}
 */
function addManifest(manifest, parent) {
  return new Promise((resolve, reject) => {
    // create test structure
    const suite = {
      title: manifest.name || manifest.label,
      tests: [],
      suites: [],
      imports: []
    };
    parent.push(suite);

    // get entries and sequence (alias for entries)
    const entries = [].concat(
      getJsonLdValues(manifest, 'entries'),
      getJsonLdValues(manifest, 'sequence')
    );

    const includes = getJsonLdValues(manifest, 'include');
    // add includes to sequence as jsonld files
    for(let i = 0; i < includes.length; ++i) {
      entries.push(includes[i] + '.jsonld');
    }

    // resolve all entry promises and process
    Promise.all(entries).then(entries => {
      let p = Promise.resolve();
      entries.forEach(entry => {
        if(typeof entry === 'string' && entry.endsWith('js')) {
          // process later as a plain JavaScript file
          suite.imports.push(entry);
          return;
        } else if(typeof entry === 'function') {
          // process as a function that returns a promise
          p = p.then(() => {
            return entry(options);
          }).then(childSuite => {
            if(suite) {
              suite.suites.push(childSuite);
            }
          });
          return;
        }
        p = p.then(() => {
          return readManifestEntry(manifest, entry);
        }).then(entry => {
          if(isJsonLdType(entry, '__SKIP__')) {
            // special local skip logic
            suite.tests.push(entry);
          } else if(isJsonLdType(entry, 'mf:Manifest')) {
            // entry is another manifest
            return addManifest(entry, suite.suites);
          } else {
            // assume entry is a test
            return addTest(manifest, entry, suite.tests);
          }
        });
      });
      return p;
    }).then(() => {
      resolve();
    }).catch(err => {
      console.error(err);
      reject(err);
    });
  });
}

/**
 * Adds a test.
 *
 * @param manifest {Object} the manifest.
 * @param parent {Object} the test.
 * @param tests {Array} the list of tests to add to.
 * @return {Promise}
 */
function addTest(manifest, test, tests) {
  // expand @id and input base
  const test_id = test['@id'] || test['id'];
  //var number = test_id.substr(2);
  test['@id'] = manifest.baseIri + basename(manifest.filename) + test_id;
  test.base = manifest.baseIri + test.input;
  test.manifest = manifest;
  const description = test_id + ' ' + (test.purpose || test.name);

  const _test = {
    title: description,
    f: makeFn()
  };
  // only based on test manifest
  // skip handled via skip()
  if('only' in test) {
    _test.only = test.only;
  }
  tests.push(_test);

  function makeFn() {
    return async function() {
      const self = this;
      self.timeout(5000);
      const testInfo = TEST_TYPES[getJsonLdTestType(test)];

      // skip based on test manifest
      if('skip' in test && test.skip) {
        if(options.verboseSkip) {
          console.log('Skipping test due to manifest:',
            {id: test['@id'], name: test.name});
        }
        self.skip();
      }

      // skip based on unknown test type
      const testTypes = Object.keys(TEST_TYPES);
      if(!isJsonLdType(test, testTypes)) {
        if(options.verboseSkip) {
          const type = [].concat(
            getJsonLdValues(test, '@type'),
            getJsonLdValues(test, 'type')
          );
          console.log('Skipping test due to unknown type:',
            {id: test['@id'], name: test.name, type});
        }
        self.skip();
      }

      // skip based on test type
      if(isJsonLdType(test, SKIP_TESTS)) {
        if(options.verboseSkip) {
          const type = [].concat(
            getJsonLdValues(test, '@type'),
            getJsonLdValues(test, 'type')
          );
          console.log('Skipping test due to test type:',
            {id: test['@id'], name: test.name, type});
        }
        self.skip();
      }

      // skip based on type info
      if(testInfo.skip && testInfo.skip.type) {
        if(options.verboseSkip) {
          console.log('Skipping test due to type info:',
            {id: test['@id'], name: test.name});
        }
        self.skip();
      }

      // skip based on id regex
      if(testInfo.skip && testInfo.skip.idRegex) {
        testInfo.skip.idRegex.forEach(function(re) {
          if(re.test(test['@id'])) {
            if(options.verboseSkip) {
              console.log('Skipping test due to id:',
                {id: test['@id']});
            }
            self.skip();
          }
        });
      }

      // skip based on description regex
      if(testInfo.skip && testInfo.skip.descriptionRegex) {
        testInfo.skip.descriptionRegex.forEach(function(re) {
          if(re.test(description)) {
            if(options.verboseSkip) {
              console.log('Skipping test due to description:',
                {id: test['@id'], name: test.name, description});
            }
            self.skip();
          }
        });
      }

      // Make expandContext absolute to the manifest
      if(test.hasOwnProperty('option') && test.option.expandContext) {
        test.option.expandContext =
          prependBase(test.manifest.baseIri, test.option.expandContext);
      }

      const testOptions = getJsonLdValues(test, 'option');

      testOptions.forEach(function(opt) {
        const processingModes = getJsonLdValues(opt, 'processingMode');
        processingModes.forEach(function(pm) {
          let skipModes = [];
          if(testInfo.skip && testInfo.skip.processingMode) {
            skipModes = testInfo.skip.processingMode;
          }
          if(skipModes.indexOf(pm) !== -1) {
            if(options.verboseSkip) {
              console.log('Skipping test due to processingMode:',
                {id: test['@id'], name: test.name, processingMode: pm});
            }
            self.skip();
          }
        });
      });

      testOptions.forEach(function(opt) {
        const specVersions = getJsonLdValues(opt, 'specVersion');
        specVersions.forEach(function(sv) {
          let skipVersions = [];
          if(testInfo.skip && testInfo.skip.specVersion) {
            skipVersions = testInfo.skip.specVersion;
          }
          if(skipVersions.indexOf(sv) !== -1) {
            if(options.verboseSkip) {
              console.log('Skipping test due to specVersion:',
                {id: test['@id'], name: test.name, specVersion: sv});
            }
            self.skip();
          }
        });
      });

      const fn = testInfo.fn;
      const params = testInfo.params.map(param => param(test));
      // resolve test data
      const values = await Promise.all(params);
      let err;
      let result;
      // run and capture errors and results
      try {
        result = await jsonld[fn].apply(null, values);
      } catch(e) {
        err = e;
      }

      try {
        if(isJsonLdType(test, 'jld:NegativeEvaluationTest')) {
          await compareExpectedError(test, err);
        } else if(isJsonLdType(test, 'jld:PositiveEvaluationTest') ||
          isJsonLdType(test, 'rdfn:Urgna2012EvalTest') ||
          isJsonLdType(test, 'rdfn:Urdna2015EvalTest')) {
          if(err) {
            throw err;
          }
          await testInfo.compare(test, result);
        } else if(isJsonLdType(test, 'jld:PositiveSyntaxTest')) {
          // no checks
        } else {
          throw Error('Unknown test type: ' + test.type);
        }

        if(options.benchmark) {
          // pre-load params to avoid doc loader and parser timing
          const benchParams = testInfo.params.map(param => param(test, {
            load: true
          }));
          const benchValues = await Promise.all(benchParams);

          await new Promise((resolve, reject) => {
            const suite = new benchmark.Suite();
            suite.add({
              name: test.name,
              defer: true,
              fn: deferred => {
                jsonld[fn].apply(null, benchValues).then(() => {
                  deferred.resolve();
                });
              }
            });
            suite
              .on('start', e => {
                self.timeout((e.target.maxTime + 2) * 1000);
              })
              .on('cycle', e => {
                console.log(String(e.target));
              })
              .on('error', err => {
                reject(new Error(err));
              })
              .on('complete', () => {
                resolve();
              })
              .run({async: true});
          });
        }

        if(options.earl.report) {
          options.earl.report.addAssertion(test, true);
        }
      } catch(err) {
        if(options.bailOnError) {
          if(err.name !== 'AssertionError') {
            console.error('\nError: ', JSON.stringify(err, null, 2));
          }
          options.exit();
        }
        if(options.earl.report) {
          options.earl.report.addAssertion(test, false);
        }
        console.error('Error: ', JSON.stringify(err, null, 2));
        throw err;
      }
    };
  }
}

function getJsonLdTestType(test) {
  const types = Object.keys(TEST_TYPES);
  for(let i = 0; i < types.length; ++i) {
    if(isJsonLdType(test, types[i])) {
      return types[i];
    }
  }
  return null;
}

function readManifestEntry(manifest, entry) {
  let p = Promise.resolve();
  let _entry = entry;
  if(typeof entry === 'string') {
    let _filename;
    p = p.then(() => {
      if(entry.endsWith('json') || entry.endsWith('jsonld')) {
        // load as file
        return entry;
      }
      // load as dir with manifest.jsonld
      return joinPath(entry, 'manifest.jsonld');
    }).then(entry => {
      const dir = dirname(manifest.filename);
      return joinPath(dir, entry);
    }).then(filename => {
      _filename = filename;
      return readJson(filename);
    }).then(entry => {
      _entry = entry;
      _entry.filename = _filename;
      return _entry;
    }).catch(err => {
      if(err.code === 'ENOENT') {
        //console.log('File does not exist, skipping: ' + _filename);
        // return a "skip" entry
        _entry = {
          type: '__SKIP__',
          title: 'Not found, skipping: ' + _filename,
          filename: _filename,
          skip: true
        };
        return;
      }
      throw err;
    });
  }
  return p.then(() => {
    _entry.dirname = dirname(_entry.filename || manifest.filename);
    return _entry;
  });
}

function readTestUrl(property) {
  return async function(test, options) {
    if(!test[property]) {
      return null;
    }
    if(options && options.load) {
      // always load
      const filename = await joinPath(test.dirname, test[property]);
      return readJson(filename);
    }
    return test.manifest.baseIri + test[property];
  };
}

function readTestJson(property) {
  return async function(test) {
    if(!test[property]) {
      return null;
    }
    const filename = await joinPath(test.dirname, test[property]);
    return readJson(filename);
  };
}

function readTestNQuads(property) {
  return async function(test) {
    if(!test[property]) {
      return null;
    }
    const filename = await joinPath(test.dirname, test[property]);
    return readFile(filename);
  };
}

function createTestOptions(opts) {
  return function(test) {
    const options = {
      documentLoader: createDocumentLoader(test)
    };
    const httpOptions = ['contentType', 'httpLink', 'httpStatus', 'redirectTo'];
    const testOptions = test.option || {};
    for(const key in testOptions) {
      if(httpOptions.indexOf(key) === -1) {
        options[key] = testOptions[key];
      }
    }
    if(opts) {
      // extend options
      for(const key in opts) {
        options[key] = opts[key];
      }
    }
    return options;
  };
}

// find the expected output property or throw error
function _getExpectProperty(test) {
  if('expectErrorCode' in test) {
    return 'expectErrorCode';
  } else if('expect' in test) {
    return 'expect';
  } else if('result' in test) {
    return 'result';
  } else {
    throw Error('No expected output property found');
  }
}

async function compareExpectedJson(test, result) {
  let expect;
  try {
    expect = await readTestJson(_getExpectProperty(test))(test);
    assert.deepStrictEqual(result, expect);
  } catch(err) {
    if(options.bailOnError) {
      console.log('\nTEST FAILED\n');
      console.log('EXPECTED: ' + JSON.stringify(expect, null, 2));
      console.log('ACTUAL: ' + JSON.stringify(result, null, 2));
    }
    throw err;
  }
}

async function compareExpectedNQuads(test, result) {
  let expect;
  try {
    expect = await readTestNQuads(_getExpectProperty(test))(test);
    assert.strictEqual(result, expect);
  } catch(ex) {
    if(options.bailOnError) {
      console.log('\nTEST FAILED\n');
      console.log('EXPECTED:\n' + expect);
      console.log('ACTUAL:\n' + result);
    }
    throw ex;
  }
}

async function compareCanonizedExpectedNQuads(test, result) {
  let expect;
  try {
    expect = await readTestNQuads(_getExpectProperty(test))(test);
    const opts = {algorithm: 'URDNA2015'};
    const expectDataset = rdfCanonize.NQuads.parse(expect);
    const expectCmp = await rdfCanonize.canonize(expectDataset, opts);
    const resultDataset = rdfCanonize.NQuads.parse(result);
    const resultCmp = await rdfCanonize.canonize(resultDataset, opts);
    assert.strictEqual(resultCmp, expectCmp);
  } catch(err) {
    if(options.bailOnError) {
      console.log('\nTEST FAILED\n');
      console.log('EXPECTED:\n' + expect);
      console.log('ACTUAL:\n' + result);
    }
    throw err;
  }
}

async function compareExpectedError(test, err) {
  let expect;
  let result;
  try {
    expect = test[_getExpectProperty(test)];
    result = getJsonLdErrorCode(err);
    assert.ok(err, 'no error present');
    assert.strictEqual(result, expect);
  } catch(_err) {
    if(options.bailOnError) {
      console.log('\nTEST FAILED\n');
      console.log('EXPECTED: ' + expect);
      console.log('ACTUAL: ' + result);
    }
    // log the unexpected error to help with debugging
    console.log('Unexpected error:', err);
    throw _err;
  }
}

function isJsonLdType(node, type) {
  const nodeType = [].concat(
    getJsonLdValues(node, '@type'),
    getJsonLdValues(node, 'type')
  );
  type = Array.isArray(type) ? type : [type];
  for(let i = 0; i < type.length; ++i) {
    if(nodeType.indexOf(type[i]) !== -1) {
      return true;
    }
  }
  return false;
}

function getJsonLdValues(node, property) {
  let rval = [];
  if(property in node) {
    rval = node[property];
    if(!Array.isArray(rval)) {
      rval = [rval];
    }
  }
  return rval;
}

function getJsonLdErrorCode(err) {
  if(!err) {
    return null;
  }
  if(err.details) {
    if(err.details.code) {
      return err.details.code;
    }
    if(err.details.cause) {
      return getJsonLdErrorCode(err.details.cause);
    }
  }
  return err.name;
}

async function readJson(filename) {
  const data = await readFile(filename);
  return JSON.parse(data);
}

async function readFile(filename) {
  return options.readFile(filename);
}

async function joinPath() {
  return join.apply(null, Array.prototype.slice.call(arguments));
}

function dirname(filename) {
  if(options.nodejs) {
    return options.nodejs.path.dirname(filename);
  }
  const idx = filename.lastIndexOf('/');
  if(idx === -1) {
    return filename;
  }
  return filename.substr(0, idx);
}

function basename(filename) {
  if(options.nodejs) {
    return options.nodejs.path.basename(filename);
  }
  const idx = filename.lastIndexOf('/');
  if(idx === -1) {
    return filename;
  }
  return filename.substr(idx + 1);
}

/**
 * Creates a test remote document loader.
 *
 * @param test the test to use the document loader for.
 *
 * @return the document loader.
 */
function createDocumentLoader(test) {
  const localBases = [
    'http://json-ld.org/test-suite',
    'https://json-ld.org/test-suite',
    'https://w3c.github.io/json-ld-api/tests',
    'https://w3c.github.io/json-ld-framing/tests'
  ];
  const localLoader = function(url) {
    // always load remote-doc tests remotely in node
    // NOTE: disabled due to github pages issues.
    //if(options.nodejs && test.manifest.name === 'Remote document') {
    //  return jsonld.documentLoader(url);
    //}

    // FIXME: this check only works for main test suite and will not work if:
    // - running other tests and main test suite not installed
    // - use other absolute URIs but want to load local files
    const isTestSuite = localBases.some(function(base) {
      return url.startsWith(base);
    });
    // TODO: improve this check
    const isRelative = url.indexOf(':') === -1;
    if(isTestSuite || isRelative) {
      // attempt to load official test-suite files or relative URLs locally
      return loadLocally(url);
    }

    // load remotely
    return jsonld.documentLoader(url);
  };

  return localLoader;

  function loadLocally(url) {
    const doc = {contextUrl: null, documentUrl: url, document: null};
    const options = test.option;
    if(options && url === test.base) {
      if('redirectTo' in options && parseInt(options.httpStatus, 10) >= 300) {
        doc.documentUrl = test.manifest.baseIri + options.redirectTo;
      } else if('httpLink' in options) {
        let contentType = options.contentType || null;
        if(!contentType && url.indexOf('.jsonld', url.length - 7) !== -1) {
          contentType = 'application/ld+json';
        }
        if(!contentType && url.indexOf('.json', url.length - 5) !== -1) {
          contentType = 'application/json';
        }
        let linkHeader = options.httpLink;
        if(Array.isArray(linkHeader)) {
          linkHeader = linkHeader.join(',');
        }
        const linkHeaders = jsonld.parseLinkHeader(linkHeader);
        const linkedContext =
          linkHeaders['http://www.w3.org/ns/json-ld#context'];
        if(linkedContext && contentType !== 'application/ld+json') {
          if(Array.isArray(linkedContext)) {
            throw {name: 'multiple context link headers'};
          }
          doc.contextUrl = linkedContext.target;
        }

        // If not JSON-LD, alternate may point there
        if(linkHeaders['alternate'] &&
          linkHeaders['alternate'].type == 'application/ld+json' &&
          !(contentType || '').match(/^application\/(\w*\+)?json$/)) {
          doc.documentUrl = prependBase(url, linkHeaders['alternate'].target);
        }
      }
    }

    let p = Promise.resolve();
    if(doc.documentUrl.indexOf(':') === -1) {
      p = p.then(() => {
        return joinPath(test.manifest.dirname, doc.documentUrl);
      }).then(filename => {
        doc.documentUrl = 'file://' + filename;
        return filename;
      });
    } else {
      p = p.then(() => {
        return joinPath(
          test.manifest.dirname,
          doc.documentUrl.substr(test.manifest.baseIri.length));
      }).then(fn => {
        return fn;
      });
    }

    return p.then(readJson).then(json => {
      doc.document = json;
      return doc;
    }).catch(() => {
      throw {name: 'loading document failed', url};
    });
  }
}

};
