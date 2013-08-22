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
var _nodejs = true;

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var _jsdir = process.env.JSDIR || 'js';
var jsonld = require('../' + _jsdir + '/jsonld')();
require('../' + _jsdir + '/Promise');

var JSONLD_TEST_SUITE = '../json-ld.org/test-suite';

var TEST_TYPES = {
  'jld:CompactTest': {
    fn: 'compact',
    params: [
      readTestJson('input'),
      readTestJson('context'),
      createTestOptions()
    ],
    compare: compareExpectedJson
  },
  'jld:ExpandTest': {
    fn: 'expand',
    params: [
      readTestJson('input'),
      createTestOptions()
    ],
    compare: compareExpectedJson
  },
  'jld:FlattenTest': {
    fn: 'flatten',
    params: [
      readTestJson('input'),
      function() {return null;},
      createTestOptions()
    ],
    compare: compareExpectedJson
  },
  'jld:FrameTest': {
    fn: 'frame',
    params: [
      readTestJson('input'),
      readTestJson('frame'),
      createTestOptions()
    ],
    compare: compareExpectedJson
  },
  'jld:FromRDFTest': {
    fn: 'fromRDF',
    params: [
      readTestNQuads('input'),
      createTestOptions({format: 'application/nquads'}),
    ],
    compare: compareExpectedJson
  },
  'jld:NormalizeTest': {
    fn: 'normalize',
    params: [
      readTestJson('input'),
      createTestOptions({format: 'application/nquads'})
    ],
    compare: compareExpectedNQuads
  },
  'jld:ToRDFTest': {
    fn: 'toRDF',
    params: [
      readTestJson('input'),
      createTestOptions({format: 'application/nquads'})
    ],
    compare: compareExpectedNQuads
  }
};

var SKIP_TESTS = [
  'jld:ApiErrorTest'
];

// create earl report
var earl = new EarlReport();

// run tests
describe('JSON-LD', function() {
  var dir =
    process.env.JSONLD_TEST_SUITE ||
    JSONLD_TEST_SUITE;
  dir = resolvePath(dir);
  var filename = joinPath(dir, 'manifest.jsonld');
  var rootManifest = readJson(filename);
  rootManifest.filename = filename;
  addManifest(rootManifest);
});

// FIXME: add command line params for outputting earl report
/*
describe('EARL report', function() {
  it('should print the earl report', function() {
    earl.write('/tmp/jsonld.js-earl.jsonld');
  });
});*/

/**
 * Adds the tests for all entries in the given manifest.
 *
 * @param manifest the manifest.
 */
function addManifest(manifest) {
  describe(manifest.name, function() {
    var sequence = getJsonLdValues(manifest, 'sequence');
    for(var i = 0; i < sequence.length; ++i) {
      var entry = readManifestEntry(manifest, sequence[i]);

      // entry is another manifest
      if(isJsonLdType(entry, 'mf:Manifest')) {
        addManifest(entry);
      }
      // assume entry is a test
      else {
        addTest(manifest, entry);
      }
    }
  });
}

function addTest(manifest, test) {
  // skip unknown and explicitly skipped test types
  var testTypes = Object.keys(TEST_TYPES);
  if(!isJsonLdType(test, testTypes) || isJsonLdType(test, SKIP_TESTS)) {
    console.log('Skipping test "' + test.name + '" of type: ' +
      getJsonLdValues(test, '@type'));
  }

  // expand @id and input base
  var number = test['@id'].substr(2);
  test['@id'] = manifest.baseIri + basename(manifest.filename) + test['@id'];
  test.base = manifest.baseIri + test.input;
  var description = number + ' ' + (test.purpose || test.name);

  // get appropriate API and run test
  var api = _nodejs ? jsonld() : jsonld.promises();
  it(description, function(done) {
    var testInfo = TEST_TYPES[getJsonLdTestType(test)];
    var fn = testInfo.fn;
    var params = testInfo.params;
    params = params.map(function(param) {return param(test);});
    var callback = function(err, result) {
      try {
        if(isPositiveTest(test)) {
          if(err) {
            earl.addAssertion(test, false);
            return done(err);
          }
          testInfo.compare(test, result);
        }
        else if(isNegativeTest(test)) {
          compareExpectedError(test, err);
        }
        earl.addAssertion(test, true);
        return done();
      }
      catch(ex) {
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

function readTestJson(property) {
  return function(test) {
    var filename = joinPath(test.dirname, test[property]);
    return readJson(filename);
  };
}

function readTestNQuads(property) {
  return function(test) {
    var filename = joinPath(test.dirname, test[property]);
    return readFile(filename);
  };
}

function createTestOptions(opts) {
  return function(test) {
    var options = {};
    options.base = test.base;
    options.useNativeTypes = true;
    if(opts) {
      // extend options
      for(var key in opts) {
        options[key] = opts[key];
      }
    }
    return options;
  };
}

function compareExpectedJson(test, result) {
  var expect = readTestJson('expect')(test);
  assert.deepEqual(result, expect);
}

function compareExpectedNQuads(test, result) {
  assert.equal(result, readTestNQuads('expect')(test));
}

function compareExpectedError(test, err) {
  // FIXME: check error type against expected
  assert.ok(err);
}

function isJsonLdType(node, type) {
  var nodeType = getJsonLdValues(node, '@type');
  type = Array.isArray(type) ? type : [type];
  for(var i = 0; i < type.length; ++i) {
    if(nodeType.indexOf(type[i]) !== -1) {
      return true;
    }
  }
  return false;
}

function getJsonLdValues(node, property) {
  var rval = null;
  if(property in node) {
    rval = node[property];
    if(!Array.isArray(rval)) {
      rval = [rval];
    }
  }
  return rval;
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

function joinPath(dir, filename) {
  if(_nodejs) {
    return path.join(dir, filename);
  }
  else {
    var rval = dir;
    if(dir.substr(-1) !== fs.separator &&
      filename.substr(0) !== fs.separator) {
      rval += fs.separator;
    }
    return rval;
  }
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
      'earl:outcome': pass ? 'earl:pass' : 'earl:fail'
    }
  });
  return this;
};

EarlReport.prototype.write = function(filename) {
  var json = JSON.stringify(this.report, null, 2);
  if(_nodejs) {
    fs.writeFileSync(filename, json);
  }
  else {
    fs.write(filename, json, 'w');
  }
  return this;
};

})();
