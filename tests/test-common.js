/**
 * Common test runner for JSON-LD.
 *
 * @author Dave Longley
 * @author David I. Lehn
 *
 * Copyright (c) 2011-2017 Digital Bazaar, Inc. All rights reserved.
 */
const EarlReport = require('./earl-report');
const join = require('join-path-js');

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
      specVersion: ['json-ld-1.0'],
      regex: [/#t0073/, /#t[n]/]
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
      regex: [/#tn/]
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
      regex: [/#t0073/, /#tn/]
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
      specVersion: ['json-ld-1.1']
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
    fn: 'fromRDF',
    params: [
      readTestNQuads('input'),
      createTestOptions({format: 'application/nquads'})
    ],
    compare: compareExpectedJson
  },
  'jld:NormalizeTest': {
    fn: 'normalize',
    params: [
      readTestUrl('input'),
      createTestOptions({format: 'application/nquads'})
    ],
    compare: compareExpectedNQuads
  },
  'jld:ToRDFTest': {
    skip: {},
    fn: 'toRDF',
    params: [
      readTestUrl('input'),
      createTestOptions({format: 'application/nquads'})
    ],
    compare: compareExpectedNQuads
  },
  'rdfn:Urgna2012EvalTest': {
    fn: 'normalize',
    params: [
      readTestNQuads('action'),
      createTestOptions({
        algorithm: 'URGNA2012',
        inputFormat: 'application/nquads',
        format: 'application/nquads'
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
        inputFormat: 'application/nquads',
        format: 'application/nquads'
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

return new Promise((resolve, reject) => {

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
        if(test.skip) {
          it.skip(test.title);
          return;
        }
        it(test.title, test.f);
      });
      _testsToMocha(suite.suites);
    });
    suite.imports.forEach(f => {
      options.import(f)
    });
  });
};

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
    var entries = [].concat(
      getJsonLdValues(manifest, 'entries'),
      getJsonLdValues(manifest, 'sequence')
    );

    var includes = getJsonLdValues(manifest, 'include');
    // add includes to sequence as jsonld files
    for(var i = 0; i < includes.length; ++i) {
      entries.push(includes[i] + '.jsonld');
    }

    // resolve all entry promises and process
    Promise.all(entries).then(entries => {
      let p = Promise.resolve();
      entries.forEach((entry) => {
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
      resolve()
    }).catch(err => {
      console.error(err);
      reject(err)
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
  var test_id = test['@id'] || test['id'];
  //var number = test_id.substr(2);
  test['@id'] = manifest.baseIri + basename(manifest.filename) + test_id;
  test.base = manifest.baseIri + test.input;
  test.manifest = manifest;
  var description = test_id + ' ' + (test.purpose || test.name);

  tests.push({
    title: description + ' (promise)',
    f: makeFn({useCallbacks: false})
  });
  tests.push({
    title: description + ' (callback)',
    f: makeFn({useCallbacks: true})
  });

  function makeFn({useCallbacks}) {
    return function(done) {
      var self = this;
      self.timeout(5000);
      var testInfo = TEST_TYPES[getJsonLdTestType(test)];

      // skip unknown and explicitly skipped test types
      var testTypes = Object.keys(TEST_TYPES);
      if(!isJsonLdType(test, testTypes) || isJsonLdType(test, SKIP_TESTS)) {
        var type = [].concat(
          getJsonLdValues(test, '@type'),
          getJsonLdValues(test, 'type')
        );
        //console.log('Skipping test "' + test.name + '" of type: ' + type);
        self.skip();
      }

      if(testInfo.skip && testInfo.skip.type) {
        //console.log('Skipping test "' + test.name + '" of type: ' + type);
        self.skip();
      }

      if(testInfo.skip && testInfo.skip.regex) {
        testInfo.skip.regex.forEach(function(re) {
          if(re.test(description)) {
            //console.log('Skipping test "' + test.name + '" of description: ' + description);
            self.skip();
          }
        });
      }

      var testOptions = getJsonLdValues(test, 'option');

      testOptions.forEach(function(opt) {
        var processingModes = getJsonLdValues(opt, 'processingMode');
        processingModes.forEach(function(pm) {
          var skipModes = [];
          if(testInfo.skip && testInfo.skip.processingMode) {
            skipModes = testInfo.skip.processingMode;
          }
          if(skipModes.indexOf(pm) !== -1) {
            //console.log('Skipping test "' + test.name + '" of processing mode: ' + pm);
            self.skip();
          }
        });
      });

      testOptions.forEach(function(opt) {
        var specVersions = getJsonLdValues(opt, 'specVersion');
        specVersions.forEach(function(sv) {
          var skipVersions = [];
          if(testInfo.skip && testInfo.skip.specVersion) {
            skipVersions = testInfo.skip.specVersion;
          }
          if(skipVersions.indexOf(sv) !== -1) {
            //console.log('Skipping test "' + test.name + '" for spec version: ' + sv);
            self.skip();
          }
        });
      });

      var fn = testInfo.fn;
      var params = testInfo.params;
      params = params.map(function(param) {return param(test);});
      var callback = function(err, result) {
        Promise.resolve().then(() => {
          if(isNegativeTest(test)) {
            return compareExpectedError(test, err);
          } else {
            // default is to assume positive and skip isPositiveTest(test) check
            if(err) {
              throw err;
            }
            return testInfo.compare(test, result);
          }
        }).then(() => {
          if(options.earl.report) {
            options.earl.report.addAssertion(test, true);
          }
          done();
        }).catch(err => {
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
          done(err);
        });
      };

      // add nodejs style callback
      if(useCallbacks) {
        params.push(callback);
      }

      // resolve test data run
      Promise.all(params).then(values => {
        // get appropriate API and run test
        var api = useCallbacks ? jsonld : jsonld.promises;
        var promise = api[fn].apply(api, values);

        // promise style
        if(!useCallbacks) {
          return promise.then(callback.bind(null, null), callback);
        }
      }).catch(err => {
        console.error(err);
        throw err;
      });
    };
  }
}

function isPositiveTest(test) {
  return isJsonLdType(test, 'jld:PositiveEvaluationTest');
}

function isNegativeTest(test) {
  return isJsonLdType(test, 'jld:NegativeEvaluationTest');
}

function getJsonLdTestType(test) {
  var types = Object.keys(TEST_TYPES);
  for(var i = 0; i < types.length; ++i) {
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
  return function(test) {
    if(!test[property]) {
      return null;
    }
    return test.manifest.baseIri + test[property];
  };
}

function readTestJson(property) {
  return function(test) {
    if(!test[property]) {
      return null;
    }
    return joinPath(test.dirname, test[property])
      .then(readJson);
  };
}

function readTestNQuads(property) {
  return function(test) {
    if(!test[property]) {
      return null;
    }
    return joinPath(test.dirname, test[property])
      .then(readFile);
  };
}

function createTestOptions(opts) {
  return function(test) {
    var options = {
      documentLoader: createDocumentLoader(test)
    };
    var httpOptions = ['contentType', 'httpLink', 'httpStatus', 'redirectTo'];
    var testOptions = test.option || {};
    for(var key in testOptions) {
      if(httpOptions.indexOf(key) === -1) {
        options[key] = testOptions[key];
      }
    }
    if(opts) {
      // extend options
      for(var key in opts) {
        options[key] = opts[key];
      }
    }
    let p = Promise.resolve();
    for(var key in options) {
      if(key === 'expandContext') {
        p = p.then(() => {
          return joinPath(test.dirname, options[key]);
        }).then(filename => {
          return readJson(filename);
        }).then(json => {
          options[key] = json;
        });
      }
    }

    return p.then(() => options);
  };
}

// find the expected output property or throw error
function _getExpectProperty(test) {
  if('expect' in test) {
    return 'expect';
  } else if('result' in test) {
    return 'result';
  } else {
    throw Error('No expected output property found');
  }
}

function compareExpectedJson(test, result) {
  let _expect;
  return readTestJson(_getExpectProperty(test))(test).then(expect => {
    _expect = expect;
    assert.deepEqual(result, expect);
  }).catch(err => {
    if(options.bailOnError) {
      console.log('\nTEST FAILED\n');
      console.log('EXPECTED: ' + JSON.stringify(_expect, null, 2));
      console.log('ACTUAL: ' + JSON.stringify(result, null, 2));
    }
    throw err;
  });
}

function compareExpectedNQuads(test, result) {
  let _expect;
  return readTestNQuads(_getExpectProperty(test))(test).then(expect => {
    _expect = expect;
    assert.equal(result, expect);
  }).catch(err => {
    if(options.bailOnError) {
      console.log('\nTEST FAILED\n');
      console.log('EXPECTED:\n' + _expect);
      console.log('ACTUAL:\n' + result);
    }
    throw err;
  });
}

function compareExpectedError(test, err) {
  let expect;
  let result;
  return Promise.resolve().then(() => {
    expect = test[_getExpectProperty(test)];
    result = getJsonLdErrorCode(err);
    assert.ok(err);
    assert.equal(result, expect);
  }).catch(err => {
    if(options.bailOnError) {
      console.log('\nTEST FAILED\n');
      console.log('EXPECTED: ' + expect);
      console.log('ACTUAL: ' + result);
    }
    throw err;
  });
}

function isJsonLdType(node, type) {
  var nodeType = [].concat(
    getJsonLdValues(node, '@type'),
    getJsonLdValues(node, 'type')
  );
  type = Array.isArray(type) ? type : [type];
  for(var i = 0; i < type.length; ++i) {
    if(nodeType.indexOf(type[i]) !== -1) {
      return true;
    }
  }
  return false;
}

function getJsonLdValues(node, property) {
  var rval = [];
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

function readJson(filename) {
  return readFile(filename).then((data) => {
    return JSON.parse(data);
  });
}

function readFile(filename) {
  return options.readFile(filename);
}

function joinPath() {
  return Promise.resolve(
    join.apply(null, Array.prototype.slice.call(arguments)));
}

function dirname(filename) {
  if(options.nodejs) {
    return options.nodejs.path.dirname(filename);
  }
  var idx = filename.lastIndexOf('/');
  if(idx === -1) {
    return filename;
  }
  return filename.substr(0, idx);
}

function basename(filename) {
  if(options.nodejs) {
    return options.nodejs.path.basename(filename);
  }
  var idx = filename.lastIndexOf('/');
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
  const _httpTestSuiteBase = 'http://json-ld.org/test-suite';
  const _httpsTestSuiteBase = 'https://json-ld.org/test-suite';
  var localLoader = function(url, callback) {
    // always load remote-doc tests remotely in node
    if(options.nodejs && test.manifest.name === 'Remote document') {
      return jsonld.loadDocument(url, callback);
    }

    // FIXME: this check only works for main test suite and will not work if:
    // - running other tests and main test suite not installed
    // - use other absolute URIs but want to load local files
    var isTestSuite =
      url.startsWith(_httpTestSuiteBase) ||
      url.startsWith(_httpsTestSuiteBase);
    // TODO: improve this check
    var isRelative = url.indexOf(':') === -1;
    if(isTestSuite || isRelative) {
      // attempt to load official test-suite files or relative URLs locally
      loadLocally(url).then(callback.bind(null, null), callback);
      // don't return the promise
      return;
    }

    // load remotely
    return jsonld.loadDocument(url, callback);
  };

  return localLoader;

  function loadLocally(url) {
    var doc = {contextUrl: null, documentUrl: url, document: null};
    var options = test.option;
    if(options && url === test.base) {
      if('redirectTo' in options && parseInt(options.httpStatus, 10) >= 300) {
        doc.documentUrl = test.manifest.baseIri + options.redirectTo;
      } else if('httpLink' in options) {
        var contentType = options.contentType || null;
        if(!contentType && url.indexOf('.jsonld', url.length - 7) !== -1) {
          contentType = 'application/ld+json';
        }
        var linkHeader = options.httpLink;
        if(Array.isArray(linkHeader)) {
          linkHeader = linkHeader.join(',');
        }
        linkHeader = jsonld.parseLinkHeader(
          linkHeader)['http://www.w3.org/ns/json-ld#context'];
        if(linkHeader && contentType !== 'application/ld+json') {
          if(Array.isArray(linkHeader)) {
            throw {name: 'multiple context link headers'};
          }
          doc.contextUrl = linkHeader.target;
        }
      }
    }

    var p = Promise.resolve();
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
    }).catch(err => {
      throw {name: 'loading document failed', url: url};
    });
  }
}

};
