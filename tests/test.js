/**
 * Test and benchmark runner for jsonld.js.
 *
 * Use environment vars to control:
 *
 * General:
 *   Boolean env options enabled with case insensitve values:
 *     'true', 't', 'yes', 'y', 'on', '1', similar for false
 * Set dirs, manifests, or js to run:
 *   TESTS="r1 r2 ..."
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
 *   BAIL=<boolean> (default: false)
 * Verbose skip reasons:
 *   VERBOSE_SKIP=<boolean> (default: false)
 * Benchmark mode:
 *   Basic:
 *   BENCHMARK=1
 *   With options:
 *   BENCHMARK=key1=value1,key2=value2,...
 * Benchmark options:
 *   jobs=N1[+N2[...]] (default: 1)
 *     Run each test with jobs size of N1, N2, ...
 *     Recommend 1+10 to get simple and parallel data.
 *     Note the N>1 tests use custom reporter to show time per job.
 *   fast1=<boolean> (default: false)
 *     Run single job faster by omitting Promise.all wrapper.
 *
 * @author Dave Longley
 * @author David I. Lehn
 *
 * Copyright (c) 2011-2023 Digital Bazaar, Inc. All rights reserved.
 */
/* eslint-disable indent */
const EarlReport = require('./earl-report');
const join = require('join-path-js');
const jsonld = require('..');
const {klona} = require('klona');
const {prependBase} = require('../lib/url');
const rdfCanonize = require('rdf-canonize');

// helper functions, inspired by 'boolean' package
function isTrue(value) {
  return value && [
    'true', 't', 'yes', 'y', 'on', '1'
  ].includes(value.trim().toLowerCase());
}

function isFalse(value) {
  return !value || [
    'false', 'f', 'no', 'n', 'off', '0'
  ].includes(value.trim().toLowerCase());
}

module.exports = async function(options) {

'use strict';

const assert = options.assert;
const benchmark = options.benchmark;

const bailOnError = isTrue(options.env.BAIL || 'false');
const verboseSkip = isTrue(options.env.VERBOSE_SKIP || 'false');

const benchmarkOptions = {
  enabled: false,
  jobs: [1],
  fast1: false
};

if(options.env.BENCHMARK) {
  if(!isFalse(options.env.BENCHMARK)) {
    benchmarkOptions.enabled = true;
    if(!isTrue(options.env.BENCHMARK)) {
      options.env.BENCHMARK.split(',').forEach(pair => {
        const kv = pair.split('=');
        switch(kv[0]) {
          case 'jobs':
            benchmarkOptions.jobs = kv[1].split('+').map(n => parseInt(n, 10));
            break;
          case 'fast1':
            benchmarkOptions.fast1 = isTrue(kv[1]);
            break;
          default:
            throw new Error(`Unknown benchmark option: "${pair}"`);
        }
      });
    }
  }
}

// Only support one job size for EARL output to simplify reporting and avoid
// multi-variable issues. Can compare multiple runs with different job sizes.
if(options.earl.filename && benchmarkOptions.jobs.length > 1) {
  throw new Error('Only one job size allowed when outputting EARL.');
}

const manifest = options.manifest || {
  '@context': 'https://json-ld.org/test-suite/context.jsonld',
  '@id': '',
  '@type': 'mf:Manifest',
  description: 'Top level jsonld.js manifest',
  name: 'jsonld.js',
  // allow for async generated entries
  // used for karma tests to allow async server exist check
  sequence: (await Promise.all(options.entries || [])).flat().filter(e => e),
  filename: '/'
};

const TEST_TYPES = {
  'jld:CompactTest': {
    skip: {
      // skip tests where behavior changed for a 1.1 processor
      // see JSON-LD 1.0 Errata
      specVersion: ['json-ld-1.0'],
      // NOTE: idRegex format:
      // /MMM-manifest#tNNN$/,
      // FIXME
      idRegex: [
        /compact-manifest#t0112$/,
        /compact-manifest#t0113$/,
        // html
        /html-manifest#tc001$/,
        /html-manifest#tc002$/,
        /html-manifest#tc003$/,
        /html-manifest#tc004$/,
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
      // NOTE: idRegex format:
      // /MMM-manifest#tNNN$/,
      // FIXME
      idRegex: [
        // spec issues
        // Unclear how to handle {"@id": null} edge case
        // See https://github.com/w3c/json-ld-api/issues/480
        // non-normative test, also see toRdf-manifest#te122
        ///expand-manifest#t0122$/,

        // misc
        /expand-manifest#tc037$/,
        /expand-manifest#tc038$/,
        /expand-manifest#ter54$/,

        // html
        /html-manifest#te001$/,
        /html-manifest#te002$/,
        /html-manifest#te003$/,
        /html-manifest#te004$/,
        /html-manifest#te005$/,
        /html-manifest#te006$/,
        /html-manifest#te007$/,
        /html-manifest#te010$/,
        /html-manifest#te011$/,
        /html-manifest#te012$/,
        /html-manifest#te013$/,
        /html-manifest#te014$/,
        /html-manifest#te015$/,
        /html-manifest#te016$/,
        /html-manifest#te017$/,
        /html-manifest#te018$/,
        /html-manifest#te019$/,
        /html-manifest#te020$/,
        /html-manifest#te021$/,
        /html-manifest#te022$/,
        /html-manifest#tex01$/,
        // HTML extraction
        /expand-manifest#thc01$/,
        /expand-manifest#thc02$/,
        /expand-manifest#thc03$/,
        /expand-manifest#thc04$/,
        /expand-manifest#thc05$/,
        // remote
        /remote-doc-manifest#t0013$/, // HTML
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
      // NOTE: idRegex format:
      // /MMM-manifest#tNNN$/,
      // FIXME
      idRegex: [
        // html
        /html-manifest#tf001$/,
        /html-manifest#tf002$/,
        /html-manifest#tf003$/,
        /html-manifest#tf004$/,
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
      // NOTE: idRegex format:
      // /MMM-manifest#tNNN$/,
      // FIXME
      idRegex: []
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
      // NOTE: idRegex format:
      // /MMM-manifest#tNNN$/,
      // FIXME
      idRegex: [
        // direction (compound-literal)
        /fromRdf-manifest#tdi09$/,
        /fromRdf-manifest#tdi10$/,
        /fromRdf-manifest#tdi11$/,
        /fromRdf-manifest#tdi12$/,
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
      // NOTE: idRegex format:
      // /MMM-manifest#tNNN$/,
      // FIXME
      idRegex: [
        // spec issues
        // Unclear how to handle {"@id": null} edge case
        // See https://github.com/w3c/json-ld-api/issues/480
        // normative test, also see expand-manifest#t0122
        ///toRdf-manifest#te122$/,

        // misc
        /toRdf-manifest#tc037$/,
        /toRdf-manifest#tc038$/,
        /toRdf-manifest#ter54$/,
        /toRdf-manifest#tli12$/,
        /toRdf-manifest#tli14$/,

        // well formed
        /toRdf-manifest#twf05$/,

        // html
        /html-manifest#tr001$/,
        /html-manifest#tr002$/,
        /html-manifest#tr003$/,
        /html-manifest#tr004$/,
        /html-manifest#tr005$/,
        /html-manifest#tr006$/,
        /html-manifest#tr007$/,
        /html-manifest#tr010$/,
        /html-manifest#tr011$/,
        /html-manifest#tr012$/,
        /html-manifest#tr013$/,
        /html-manifest#tr014$/,
        /html-manifest#tr015$/,
        /html-manifest#tr016$/,
        /html-manifest#tr017$/,
        /html-manifest#tr018$/,
        /html-manifest#tr019$/,
        /html-manifest#tr020$/,
        /html-manifest#tr021$/,
        /html-manifest#tr022$/,
        // Invalid Statement
        /toRdf-manifest#te075$/,
        /toRdf-manifest#te111$/,
        /toRdf-manifest#te112$/,
        // direction (compound-literal)
        /toRdf-manifest#tdi11$/,
        /toRdf-manifest#tdi12$/,
      ]
    },
    fn: 'toRDF',
    params: [
      readTestUrl('input'),
      createTestOptions({format: 'application/n-quads'})
    ],
    compare: compareCanonizedExpectedNQuads
  },
  'rdfc:RDFC10EvalTest': {
    skip: {
      // NOTE: idRegex format:
      // /manifest-urdna2015#testNNN$/,
      // FIXME
      idRegex: [
        // Unsupported U escape
        // /manifest-urdna2015#test060/
      ]
    },
    fn: 'canonize',
    params: [
      readTestNQuads('action'),
      createTestOptions({
        algorithm: 'RDFC-1.0',
        inputFormat: 'application/n-quads',
        format: 'application/n-quads'
      })
    ],
    compare: compareExpectedNQuads
  },
  'rdfc:RDFC10NegativeEvalTest': {
    skip: {
      // NOTE: idRegex format:
      // /manifest-rdfc10#testNNN$/,
      idRegex: []
    },
    fn: 'canonize',
    params: [
      readTestNQuads('action'),
      createTestOptions({
        algorithm: 'RDFC-1.0',
        inputFormat: 'application/n-quads',
        format: 'application/n-quads'
      })
    ]
  },
  'rdfc:RDFC10MapTest': {
    skip: {
      // NOTE: idRegex format:
      // /manifest-rdfc10#testNNN$/,
      idRegex: []
    },
    fn: 'canonize',
    params: [
      readTestNQuads('action'),
      createTestOptions({
        algorithm: 'RDFC-1.0',
        inputFormat: 'application/n-quads',
        format: 'application/n-quads'
      })
    ],
    preRunAdjustParams: ({params, extra}) => {
      // add canonicalIdMap
      const m = new Map();
      extra.canonicalIdMap = m;
      params[1].canonizeOptions = params[1].canonizeOptions || {};
      params[1].canonizeOptions.canonicalIdMap = m;
      return params;
    },
    postRunAdjustParams: ({params}) => {
      // restore output param to empty map
      const m = new Map();
      params[1].canonizeOptions = params[1].canonizeOptions || {};
      params[1].canonizeOptions.canonicalIdMap = m;
    },
    compare: compareExpectedCanonicalIdMap
  }
};

const SKIP_TESTS = [];

// build test env from defaults
const testEnvFields = [
  'label', 'arch', 'cpu', 'cpuCount', 'platform', 'runtime', 'runtimeVersion',
  'comment', 'version'
];
let testEnv = null;
if(options.env.TEST_ENV) {
  let _test_env = options.env.TEST_ENV;
  if(!isFalse(_test_env)) {
    testEnv = {};
    if(isTrue(_test_env)) {
      _test_env = 'auto';
    }
    _test_env.split(',').forEach(pair => {
      if(pair === 'auto') {
        testEnvFields.forEach(f => testEnv[f] = 'auto');
      } else {
        const kv = pair.split('=');
        if(kv.length === 1) {
          testEnv[kv[0]] = 'auto';
        } else {
          testEnv[kv[0]] = kv.slice(1).join('=');
        }
      }
    });
    testEnvFields.forEach(f => {
      if(testEnv[f] === 'auto') {
        testEnv[f] = options.testEnvDefaults[f];
      }
    });
  }
}

// create earl report
if(options.earl && options.earl.filename) {
  options.earl.report = new EarlReport({
    env: testEnv
  });
  if(benchmarkOptions.enabled) {
    options.earl.report.setupForBenchmarks({testEnv});
  }
}

// async generated tests
// _tests => [{suite}, ...]
// suite => {
//   title: ...,
//   tests: [test, ...],
//   suites: [suite, ...]
// }
const _tests = [];

await addManifest(manifest, _tests);
const result = _testsToMocha(_tests);
if(options.earl.report) {
  describe('Writing EARL report to: ' + options.earl.filename, function() {
    // print out EARL even if .only was used
    const _it = result.hadOnly ? it.only : it;
    _it('should print the earl report', function() {
      return options.writeFile(
        options.earl.filename, options.earl.report.reportJson());
    });
  });
}

return;

// build mocha tests from local test structure
function _testsToMocha(tests) {
  let hadOnly = false;
  tests.forEach(suite => {
    if(suite.skip) {
      describe.skip(suite.title);
      return;
    }
    describe(suite.title, () => {
      suite.tests.forEach(test => {
        if(test.only) {
          hadOnly = true;
          it.only(test.title, test.f);
          return;
        }
        it(test.title, test.f);
      });
      const {hadOnly: _hadOnly} = _testsToMocha(suite.suites);
      hadOnly = hadOnly || _hadOnly;
    });
    suite.imports.forEach(f => {
      options.import(f);
    });
  });
  return {
    hadOnly
  };
}

/**
 * Adds the tests for all entries in the given manifest.
 *
 * @param {object} manifest - The manifest.
 * @param {object} parent - The parent test structure.
 * @returns {Promise} - A promise with no value.
 */
async function addManifest(manifest, parent) {
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
  for await (const entry of await Promise.all(entries)) {
    if(typeof entry === 'string' && entry.endsWith('js')) {
      // process later as a plain JavaScript file
      suite.imports.push(entry);
      continue;
    } else if(typeof entry === 'function') {
      // process as a function that returns a promise
      const childSuite = await entry(options);
      if(suite) {
        suite.suites.push(childSuite);
      }
      continue;
    }
    const manifestEntry = await readManifestEntry(manifest, entry);
    if(isJsonLdType(manifestEntry, '__SKIP__')) {
      // special local skip logic
      suite.tests.push(manifestEntry);
    } else if(isJsonLdType(manifestEntry, 'mf:Manifest')) {
      // entry is another manifest
      await addManifest(manifestEntry, suite.suites);
    } else {
      // assume entry is a test
      await addTest(manifest, manifestEntry, suite.tests);
    }
  }
}

/**
 * Common adjust params helper.
 *
 * @param {object} params - The param to adjust.
 * @param {object} test - The test.
 */
function _commonAdjustParams(params, test) {
  if(isJsonLdType(test, 'rdfc:RDFC10EvalTest') ||
    isJsonLdType(test, 'rdfc:RDFC10MapTest') ||
    isJsonLdType(test, 'rdfc:RDFC10NegativeEvalTest')) {
    if(test.hashAlgorithm) {
      params.canonizeOptions = params.canonizeOptions || {};
      params.canonizeOptions.messageDigestAlgorithm = test.hashAlgorithm;
    }
    if(test.computationalComplexity === 'low') {
      // simple test cases
      params.canonizeOptions = params.canonizeOptions || {};
      params.canonizeOptions.maxWorkFactor = 0;
    }
    if(test.computationalComplexity === 'medium') {
      // tests between O(n) and O(n^2)
      params.canonizeOptions = params.canonizeOptions || {};
      params.canonizeOptions.maxWorkFactor = 2;
    }
    if(test.computationalComplexity === 'high') {
      // poison tests between O(n^2) and O(n^3)
      params.canonizeOptions = params.canonizeOptions || {};
      params.canonizeOptions.maxWorkFactor = 3;
    }
  }
}

/**
 * Adds a test.
 *
 * @param {object} manifest - The manifest.
 * @param {object} test - The test.
 * @param {Array} tests - The list of tests to add to.
 * @returns {Promise} - A promise with no value.
 */
async function addTest(manifest, test, tests) {
  // expand @id and input base
  const test_id = test['@id'] || test.id;
  //var number = test_id.substr(2);
  test['@id'] =
    (manifest.baseIri || '') +
    basename(manifest.filename).replace('.jsonld', '') +
    test_id;
  test.base = manifest.baseIri + test.input;
  test.manifest = manifest;
  const description = test_id + ' ' + (test.purpose || test.name);

  /*
  // build test options for omit checks
  const testInfo = TEST_TYPES[getJsonLdTestType(test)];
  const params = testInfo.params.map(param => param(test));
  const testOptions = params[1];
  */

  // number of parallel jobs for benchmarks
  const jobTests = benchmarkOptions.enabled ? benchmarkOptions.jobs : [1];
  const fast1 = benchmarkOptions.enabled ? benchmarkOptions.fast1 : true;

  jobTests.forEach(jobs => {
    const _test = {
      title: description + ` (jobs=${jobs})`,
      f: makeFn({
        test,
        adjustParams: params => {
          _commonAdjustParams(params[1], test);
          return params;
        },
        run: ({/*test, */testInfo, params}) => {
          // skip Promise.all
          if(jobs === 1 && fast1) {
            return jsonld[testInfo.fn](...params);
          }
          const all = [];
          for(let j = 0; j < jobs; j++) {
            all.push(jsonld[testInfo.fn](...params));
          }
          return Promise.all(all);
        },
        jobs,
        isBenchmark: benchmarkOptions.enabled
      })
    };
    // 'only' based on test manifest
    // 'skip' handled via skip()
    if('only' in test) {
      _test.only = test.only;
    }
    tests.push(_test);
  });
}

function makeFn({
  test,
  adjustParams = p => p,
  run,
  jobs,
  isBenchmark = false,
  unsupportedInBrowser = false
}) {
  return async function() {
    const self = this;
    self.timeout(10000);
    const testInfo = TEST_TYPES[getJsonLdTestType(test)];

    // skip if unsupported in browser
    if(unsupportedInBrowser) {
      if(verboseSkip) {
        console.log('Skipping test due no browser support:',
          {id: test['@id'], name: test.name});
      }
      self.skip();
    }

    // skip based on test manifest
    if('skip' in test && test.skip) {
      if(verboseSkip) {
        console.log('Skipping test due to manifest:',
          {id: test['@id'], name: test.name});
      }
      self.skip();
    }

    // skip based on unknown test type
    const testTypes = Object.keys(TEST_TYPES);
    if(!isJsonLdType(test, testTypes)) {
      if(verboseSkip) {
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
      if(verboseSkip) {
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
      if(verboseSkip) {
        console.log('Skipping test due to type info:',
          {id: test['@id'], name: test.name});
      }
      self.skip();
    }

    // skip based on id regex
    if(testInfo.skip && testInfo.skip.idRegex) {
      testInfo.skip.idRegex.forEach(function(re) {
        if(re.test(test['@id'])) {
          if(verboseSkip) {
            console.log('Skipping test due to id:',
              {id: test['@id']});
          }
          self.skip();
        }
      });
    }

    // skip based on description regex
    /*
    if(testInfo.skip && testInfo.skip.descriptionRegex) {
      testInfo.skip.descriptionRegex.forEach(function(re) {
        if(re.test(description)) {
          if(verboseSkip) {
            console.log('Skipping test due to description:', {
              id: test['@id'],
              name: test.name,
              description
            });
          }
          self.skip();
        }
      });
    }
    */

    // Make expandContext absolute to the manifest
    if(test.hasOwnProperty('option') && test.option.expandContext) {
      test.option.expandContext =
        prependBase(test.manifest.baseIri, test.option.expandContext);
    }

    const testOptions = getJsonLdValues(test, 'option');
    // allow special handling in case of normative test failures
    let normativeTest = true;

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

    testOptions.forEach(function(opt) {
      const normative = getJsonLdValues(opt, 'normative');
      normative.forEach(function(n) {
        normativeTest = normativeTest && n;
      });
    });

    let params = testInfo.params.map(param => param(test));
    const extra = {};
    // type specific pre run adjustments
    if(testInfo.preRunAdjustParams) {
      params = testInfo.preRunAdjustParams({params, extra});
    }
    // general adjustments
    params = adjustParams(params);
    // resolve test data
    const values = await Promise.all(params);
    // copy used to check inputs do not change
    const valuesOrig = klona(values);
    let err;
    let result;
    // run and capture errors and results
    try {
      result = await run({test, testInfo, params: values});
      // type specific post run adjustments
      if(testInfo.postRunAdjustParams) {
        testInfo.postRunAdjustParams({params: values, extra});
      }
      // check input not changed
      assert.deepStrictEqual(valuesOrig, values);
    } catch(e) {
      err = e;
    }

    try {
      if(isJsonLdType(test, 'jld:NegativeEvaluationTest')) {
        if(!isBenchmark) {
          await compareExpectedError({test, err});
        }
      } else if(isJsonLdType(test, 'rdfc:RDFC10NegativeEvalTest')) {
        if(!isBenchmark) {
          await checkError({test, err});
        }
      } else if(isJsonLdType(test, 'jld:PositiveEvaluationTest') ||
        isJsonLdType(test, 'rdfc:RDFC10EvalTest') ||
        isJsonLdType(test, 'rdfc:RDFC10MapTest')) {
        if(err) {
          throw err;
        }
        if(!isBenchmark) {
          await testInfo.compare({test, result, extra});
        }
      } else if(isJsonLdType(test, 'jld:PositiveSyntaxTest')) {
        // no checks
      } else {
        throw new Error(`Unknown test type: "${test.type}"`);
      }

      let benchmarkResult = null;
      if(benchmarkOptions.enabled) {
        const bparams = adjustParams(testInfo.params.map(param => param(test, {
          // pre-load params to avoid doc loader and parser timing
          load: true
        })));
        // resolve test data
        const bvalues = await Promise.all(bparams);

        const result = await runBenchmark({
          test,
          testInfo,
          jobs,
          run,
          params: bvalues,
          mochaTest: self
        });
        benchmarkResult = {
          // FIXME use generic prefix
          '@type': 'jldb:BenchmarkResult',
          // normalize to jobs/sec from overall ops/sec
          'jldb:hz': result.target.hz * jobs,
          'jldb:rme': result.target.stats.rme
        };
      }

      if(options.earl.report) {
        options.earl.report.addAssertion(test, true, {
          benchmarkResult
        });
      }
    } catch(err) {
      // FIXME: improve handling of non-normative errors
      // FIXME: for now, explicitly disabling tests.
      //if(!normativeTest) {
      //  // failure ok
      //  if(verboseSkip) {
      //    console.log('Skipping non-normative test due to failure:',
      //      {id: test['@id'], name: test.name});
      //  }
      //  self.skip();
      //}
      if(bailOnError) {
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

async function runBenchmark({test, testInfo, jobs, params, run, mochaTest}) {
  return new Promise((resolve, reject) => {
    const suite = new benchmark.Suite();
    suite.add({
      name: test.name,
      defer: true,
      fn: deferred => {
        run({test, testInfo, params}).then(() => {
          deferred.resolve();
        });
      }
    });
    suite
      .on('start', e => {
        // set timeout to a bit more than max benchmark time
        mochaTest.timeout((e.target.maxTime + 10) * 1000 * jobs);
      })
      .on('cycle', e => {
        const jobsHz = e.target.hz * jobs;
        const jobsPerSec = jobsHz.toFixed(jobsHz < 100 ? 2 : 0);
        const msg = `${String(e.target)} (${jobsPerSec} jobs/sec)`;
        console.log(msg);
      })
      .on('error', err => {
        reject(new Error(err));
      })
      .on('complete', e => {
        resolve(e);
      })
      .run({async: true});
  });
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
    Object.assign(options, testOptions);
    for(const key in testOptions) {
      if(httpOptions.indexOf(key) === -1) {
        options[key] = testOptions[key];
      }
    }
    if(opts) {
      // extend options
      Object.assign(options, opts);
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
    throw new Error('No expected output property found');
  }
}

async function compareExpectedJson({test, result}) {
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

async function compareExpectedNQuads({test, result}) {
  let expect;
  try {
    expect = await readTestNQuads(_getExpectProperty(test))(test);
    assert.strictEqual(result, expect);
  } catch(ex) {
    if(bailOnError) {
      console.log('\nTEST FAILED\n');
      console.log('EXPECTED:\n' + expect);
      console.log('ACTUAL:\n' + result);
    }
    throw ex;
  }
}

async function compareCanonizedExpectedNQuads({test, result}) {
  let expect;
  try {
    expect = await readTestNQuads(_getExpectProperty(test))(test);
    const opts = {
      algorithm: 'RDFC-1.0',
      // some tests need this: expand 0027 and 0062
      maxWorkFactor: 2
    };
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

async function compareExpectedCanonicalIdMap({test, result, extra}) {
  let expect;
  try {
    expect = await readTestJson(_getExpectProperty(test))(test);
    const expectMap = new Map(Object.entries(expect));
    assert.deepStrictEqual(extra.canonicalIdMap, expectMap);
  } catch(err) {
    if(options.bailOnError) {
      console.log('\nTEST FAILED\n');
      console.log('EXPECTED:\n ' + JSON.stringify(expect, null, 2));
      console.log('ACTUAL:\n' + JSON.stringify(result, null, 2));
    }
    throw err;
  }
}

async function checkError({/*test,*/ err}) {
  try {
    assert.ok(err, 'no error present');
  } catch(_err) {
    if(options.bailOnError) {
      console.log('\nTEST FAILED\n');
      console.log('EXPECTED ERROR');
    }
    throw _err;
  }
}

async function compareExpectedError({test, err}) {
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
  const nodeType = getJsonLdType(node);
  type = Array.isArray(type) ? type : [type];
  for(let i = 0; i < type.length; ++i) {
    if(nodeType.indexOf(type[i]) !== -1) {
      return true;
    }
  }
  return false;
}

function getJsonLdType(node) {
  return [].concat(
    getJsonLdValues(node, '@type'),
    getJsonLdValues(node, 'type')
  );
}

function getJsonLdValues(node, property) {
  let rval = [];
  if(property in node) {
    rval = [].concat(node[property]);
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

// check test.option.loader.rewrite map for url,
// if no test rewrite, check manifest,
// else no rewrite
function rewrite(test, url) {
  if(test.option &&
    test.option.loader &&
    test.option.loader.rewrite &&
    url in test.option.loader.rewrite) {
    return test.option.loader.rewrite[url];
  }
  const manifest = test.manifest;
  if(manifest.option &&
    manifest.option.loader &&
    manifest.option.loader.rewrite &&
    url in manifest.option.loader.rewrite) {
    return manifest.option.loader.rewrite[url];
  }
  return url;
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
    'https://json-ld.org/benchmarks',
    'https://w3c.github.io/json-ld-api/tests',
    'https://w3c.github.io/json-ld-framing/tests'
  ];

  const localLoader = function(url) {
    // always load remote-doc tests remotely in node
    // NOTE: disabled due to github pages issues.
    //if(options.nodejs && test.manifest.name === 'Remote document') {
    //  return jsonld.documentLoader(url);
    //}

    // handle loader rewrite options for test or manifest
    url = rewrite(test, url);

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
        if(linkHeaders.alternate &&
          linkHeaders.alternate.type == 'application/ld+json' &&
          !(contentType || '').match(/^application\/(\w*\+)?json$/)) {
          doc.documentUrl = prependBase(url, linkHeaders.alternate.target);
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
