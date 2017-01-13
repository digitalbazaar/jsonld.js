/**
 * Test runner for JSON-LD.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2011-2013 Digital Bazaar, Inc. All rights reserved.
 */
(function() {

'use strict';

// detect node.js (vs. phantomJS)
var _nodejs = (typeof process !== 'undefined' &&
  process.versions && process.versions.node);

if(_nodejs) {
  var _jsdir = getEnv().JSDIR || 'js';
  var fs = require('fs');
  var path = require('path');
  var jsonld = require('../' + _jsdir + '/jsonld')();
  var assert = require('assert');
  var program = require('commander');
  program
    .option('--earl [filename]', 'Output an earl report')
    .option('--bail', 'Bail when a test fails')
    .parse(process.argv);
} else {
  // Function.bind polyfill for phantomjs from:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind#Compatibility
  (function() {
    if (!Function.prototype.bind) {
      Function.prototype.bind = function(oThis) {
        if (typeof this !== 'function') {
          // closest thing possible to the ECMAScript 5
          // internal IsCallable function
          throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
        }

        var aArgs   = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP    = function() {},
            fBound  = function() {
              return fToBind.apply(this instanceof fNOP
                     ? this
                     : oThis,
                     aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        if (this.prototype) {
          // native functions don't have a prototype
          fNOP.prototype = this.prototype;
        }
        fBound.prototype = new fNOP();

        return fBound;
      };
    }
  })();

  var fs = require('fs');
  var system = require('system');
  require('./setImmediate');
  var _jsdir = getEnv().JSDIR || 'js';
  require('../' + _jsdir + '/jsonld');
  jsonld = jsonldjs;
  window.Promise = require('es6-promise').Promise;
  var assert = require('chai').assert;
  require('mocha/mocha');
  require('mocha-phantomjs/lib/mocha-phantomjs/core_extensions');
  var program = {};
  for(var i = 0; i < system.args.length; ++i) {
    var arg = system.args[i];
    if(arg.indexOf('--') === 0) {
      var argname = arg.substr(2);
      switch(argname) {
      case 'earl':
        program[argname] = system.args[i + 1];
        ++i;
        break;
      default:
        program[argname] = true;
      }
    }
  }

  mocha.setup({
    reporter: 'spec',
    ui: 'bdd'
  });
}

var JSONLD_TEST_SUITE = '../json-ld.org/test-suite';
var ROOT_MANIFEST_DIR = resolvePath(
  getEnv().JSONLD_TEST_SUITE || JSONLD_TEST_SUITE);

var TEST_TYPES = {
  'jld:CompactTest': {
    skip: {
      processingMode: ['json-ld-1.1']
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
      processingMode: ['json-ld-1.1']
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
      processingMode: ['json-ld-1.1']
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
      type: true
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
    skip: {
      regex: [/RFC3986/]
    },
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

var SKIP_TESTS = [];

// create earl report
var earl = new EarlReport();

// run tests
describe('JSON-LD', function() {
  if(!program['webidl-only']) {
    var filename = joinPath(ROOT_MANIFEST_DIR, 'manifest.jsonld');
    var rootManifest = readJson(filename);
    rootManifest.filename = filename;
    addManifest(rootManifest);
  }

  // run Web IDL tests
  // FIXME: hack to prevent Web IDL tests from running when running
  // local manifest tests that aren't part of the main JSON-LD test suite;
  // testing arch needs to be reworked to better support local tests and
  // separate them from official ones and what goes into EARL report, etc.
  if(!_nodejs && ROOT_MANIFEST_DIR.indexOf('json-ld.org/test-suite') !== -1) {
    require('./webidl/testharness.js');
    require('./webidl/WebIDLParser.js');
    require('./webidl/idlharness.js');

    describe('Web IDL', function() {
      add_result_callback(function(test) {
        it(test.name, function(done) {
          // HACK: phantomJS can't set prototype to non-writable?
          var msg = test.message || '';
          if(msg.indexOf(
            'JsonLdProcessor.prototype is writable expected false') !== -1) {
            test.status = 0;
          }
          // HACK: phantomJS can't set window property to non-enumerable?
          if(msg.indexOf(
            '"JsonLdProcessor" is enumerable expected false') !== -1) {
            test.status = 0;
          }
          //earl.addAssertion({'@id': ?}, test.status === 0);
          assert.equal(test.status, 0, test.message);
          done();
        });
      });
      //add_completion_callback(function(tests, status) {});

      // ensure that stringification tests are passed
      var toString = Object.prototype.toString;
      Object.prototype.toString = function() {
        if(this === window.JsonLdProcessor.prototype) {
          return '[object JsonLdProcessorPrototype]';
        } else if(this && this.constructor === window.JsonLdProcessor) {
          return '[object JsonLdProcessor]';
        }
        return toString.apply(this, arguments);
      };

      window.processor = new JsonLdProcessor();

      var idl_array = new IdlArray();
      idl_array.add_idls(readFile('./tests/webidl/JsonLdProcessor.idl'));
      idl_array.add_objects({JsonLdProcessor: ['window.processor']});
      idl_array.test();
    });
  }

  if(program.earl) {
    var filename = resolvePath(program.earl);
    describe('Writing EARL report to: ' + filename, function() {
      it('should print the earl report', function(done) {
        earl.write(filename);
        done();
      });
    });
  }
});

if(!_nodejs) {
  mocha.run(function() {
    phantom.exit();
  });
}

/**
 * Adds the tests for all entries in the given manifest.
 *
 * @param manifest the manifest.
 */
function addManifest(manifest) {
  describe(manifest.name || manifest.label, function() {
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

    // process entries
    for(var i = 0; i < entries.length; ++i) {
      var entry = readManifestEntry(manifest, entries[i]);

      if(isJsonLdType(entry, 'mf:Manifest')) {
        // entry is another manifest
        addManifest(entry);
      } else {
        // assume entry is a test
        addTest(manifest, entry);
      }
    }
  });
}

function addTest(manifest, test) {
  // expand @id and input base
  var test_id = test['@id'] || test['id'];
  //var number = test_id.substr(2);
  test['@id'] = manifest.baseIri + basename(manifest.filename) + test_id;
  test.base = manifest.baseIri + test.input;
  test.manifest = manifest;
  var description = test_id + ' ' + (test.purpose || test.name);

  // get appropriate API and run test
  var api = _nodejs ? jsonld : jsonld.promises;
  it(description, function(done) {
    var self = this;
    this.timeout(5000);
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

    var options = getJsonLdValues(test, 'option');
    options.forEach(function(opt) {
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

    var fn = testInfo.fn;
    var params = testInfo.params;
    params = params.map(function(param) {return param(test);});
    var callback = function(err, result) {
      try {
        if(isNegativeTest(test)) {
          compareExpectedError(test, err);
        // default is to assume positive and skip isPositiveTest(test) check
        } else {
          if(err) {
            throw err;
          }
          testInfo.compare(test, result);
        }
        earl.addAssertion(test, true);
        return done();
      } catch(ex) {
        if(program.bail) {
          if(ex.name !== 'AssertionError') {
            console.log('\nError: ', JSON.stringify(ex, null, 2));
          }
          if(_nodejs) {
            process.exit();
          } else {
            phantom.exit();
          }
        }
        earl.addAssertion(test, false);
        return done(ex);
      }
    };

    if(_nodejs) {
      params.push(callback);
    }

    // promise is undefined for node.js API
    var promise = api[fn].apply(api, params);

    if(!_nodejs) {
      promise.then(callback.bind(null, null), callback);
    }
  });
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
  var dir = dirname(manifest.filename);
  if(typeof entry === 'string') {
    var filename = joinPath(dir, entry);
    entry = readJson(filename);
    entry.filename = filename;
  }
  entry.dirname = dirname(entry.filename || manifest.filename);
  return entry;
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
    var filename = joinPath(test.dirname, test[property]);
    return readJson(filename);
  };
}

function readTestNQuads(property) {
  return function(test) {
    if(!test[property]) {
      return null;
    }
    var filename = joinPath(test.dirname, test[property]);
    return readFile(filename);
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
    for(var key in options) {
      if(key === 'expandContext') {
        var filename = joinPath(test.dirname, options[key]);
        options[key] = readJson(filename);
      }
    }

    return options;
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
  try {
    var expect = readTestJson(_getExpectProperty(test))(test);
    assert.deepEqual(result, expect);
  } catch(ex) {
    if(program.bail) {
      console.log('\nTEST FAILED\n');
      console.log('EXPECTED: ' + JSON.stringify(expect, null, 2));
      console.log('ACTUAL: ' + JSON.stringify(result, null, 2));
    }
    throw ex;
  }
}

function compareExpectedNQuads(test, result) {
  try {
    var expect = readTestNQuads(_getExpectProperty(test))(test);
    assert.equal(result, expect);
  } catch(ex) {
    if(program.bail) {
      console.log('\nTEST FAILED\n');
      console.log('EXPECTED:\n' + expect);
      console.log('ACTUAL:\n' + result);
    }
    throw ex;
  }
}

function compareExpectedError(test, err) {
  try {
    var expect = test[_getExpectProperty(test)];
    var result = getJsonLdErrorCode(err);
    assert.ok(err);
    assert.equal(result, expect);
  } catch(ex) {
    if(program.bail) {
      console.log('\nTEST FAILED\n');
      console.log('EXPECTED: ' + expect);
      console.log('ACTUAL: ' + result);
    }
    throw ex;
  }
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
  return JSON.parse(readFile(filename));
}

function readFile(filename) {
  if(_nodejs) {
    return fs.readFileSync(filename, 'utf8');
  }
  return fs.read(filename);
}

function resolvePath(to) {
  if(_nodejs) {
    return path.resolve(to);
  }
  return fs.absolute(to);
}

function joinPath() {
  return (_nodejs ? path : fs).join.apply(
    null, Array.prototype.slice.call(arguments));
}

function dirname(filename) {
  if(_nodejs) {
    return path.dirname(filename);
  }
  var idx = filename.lastIndexOf(fs.separator);
  if(idx === -1) {
    return filename;
  }
  return filename.substr(0, idx);
}

function basename(filename) {
  if(_nodejs) {
    return path.basename(filename);
  }
  var idx = filename.lastIndexOf(fs.separator);
  if(idx === -1) {
    return filename;
  }
  return filename.substr(idx + 1);
}

function getEnv() {
  if(_nodejs) {
    return process.env;
  }
  return system.env;
}

/**
 * Creates a test remote document loader.
 *
 * @param test the test to use the document loader for.
 *
 * @return the document loader.
 */
function createDocumentLoader(test) {
  var base = 'http://json-ld.org/test-suite';
  var loader = jsonld.documentLoader;
  var localLoader = function(url, callback) {
    // always load remote-doc tests remotely in node
    if(_nodejs && test.manifest.name === 'Remote document') {
      return loader(url, callback);
    }

    var idx = url.indexOf(base);
    if(idx === 0 || url.indexOf(':') === -1) {
      // attempt to load official test-suite files or relative URLs locally
      var rval;
      try {
        rval = loadLocally(url);
      } catch(ex) {
        return callback(ex);
      }
      return callback(null, rval);
    }

    // load remotely
    return jsonld.loadDocument(url, callback);
  };

  return _nodejs ? localLoader : function(url) {
    return jsonld.promisify(localLoader, url);
  };

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

    var filename;
    if(doc.documentUrl.indexOf(':') === -1) {
      filename = joinPath(ROOT_MANIFEST_DIR, doc.documentUrl);
      doc.documentUrl = 'file://' + filename;
    } else {
      filename = joinPath(
        ROOT_MANIFEST_DIR, doc.documentUrl.substr(base.length));
    }
    try {
      doc.document = readJson(filename);
    } catch(ex) {
      throw {name: 'loading document failed'};
    }
    return doc;
  }
}

function EarlReport() {
  var today = new Date();
  today = today.getFullYear() + '-' +
    (today.getMonth() < 9 ?
      '0' + (today.getMonth() + 1) : today.getMonth() + 1) + '-' +
    (today.getDate() < 10 ? '0' + today.getDate() : today.getDate());
  this.report = {
    '@context': {
      'doap': 'http://usefulinc.com/ns/doap#',
      'foaf': 'http://xmlns.com/foaf/0.1/',
      'dc': 'http://purl.org/dc/terms/',
      'earl': 'http://www.w3.org/ns/earl#',
      'xsd': 'http://www.w3.org/2001/XMLSchema#',
      'doap:homepage': {'@type': '@id'},
      'doap:license': {'@type': '@id'},
      'dc:creator': {'@type': '@id'},
      'foaf:homepage': {'@type': '@id'},
      'subjectOf': {'@reverse': 'earl:subject'},
      'earl:assertedBy': {'@type': '@id'},
      'earl:mode': {'@type': '@id'},
      'earl:test': {'@type': '@id'},
      'earl:outcome': {'@type': '@id'},
      'dc:date': {'@type': 'xsd:date'}
    },
    '@id': 'https://github.com/digitalbazaar/jsonld.js',
    '@type': [
      'doap:Project',
      'earl:TestSubject',
      'earl:Software'
    ],
    'doap:name': 'jsonld.js',
    'dc:title': 'jsonld.js',
    'doap:homepage': 'https://github.com/digitalbazaar/jsonld.js',
    'doap:license':
      'https://github.com/digitalbazaar/jsonld.js/blob/master/LICENSE',
    'doap:description': 'A JSON-LD processor for JavaScript',
    'doap:programming-language': 'JavaScript',
    'dc:creator': 'https://github.com/dlongley',
    'doap:developer': {
      '@id': 'https://github.com/dlongley',
      '@type': [
        'foaf:Person',
        'earl:Assertor'
      ],
      'foaf:name': 'Dave Longley',
      'foaf:homepage': 'https://github.com/dlongley'
    },
    'dc:date': {
      '@value': today,
      '@type': 'xsd:date'
    },
    'subjectOf': []
  };
  if(_nodejs) {
    this.report['@id'] += '#node.js';
    this.report['doap:name'] += ' node.js';
    this.report['dc:title'] += ' node.js';
  } else {
    this.report['@id'] += '#browser';
    this.report['doap:name'] += ' browser';
    this.report['dc:title'] += ' browser';
  }
}

EarlReport.prototype.addAssertion = function(test, pass) {
  this.report.subjectOf.push({
    '@type': 'earl:Assertion',
    'earl:assertedBy': this.report['doap:developer']['@id'],
    'earl:mode': 'earl:automatic',
    'earl:test': test['@id'],
    'earl:result': {
      '@type': 'earl:TestResult',
      'dc:date': new Date().toISOString(),
      'earl:outcome': pass ? 'earl:passed' : 'earl:failed'
    }
  });
  return this;
};

EarlReport.prototype.write = function(filename) {
  var json = JSON.stringify(this.report, null, 2);
  if(_nodejs) {
    fs.writeFileSync(filename, json);
  } else {
    fs.write(filename, json, 'w');
  }
  return this;
};

})();
