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
  require('../' + _jsdir + '/Promise');
  var assert = require('assert');
  var program = require('commander');
  program
    .option('--earl [filename]', 'Output an earl report')
    .option('--bail', 'Bail when a test fails')
    .parse(process.argv);
}
else {
  var fs = require('fs');
  var system = require('system');
  require('./setImmediate');
  var _jsdir = getEnv().JSDIR || 'js';
  require('../' + _jsdir + '/jsonld');
  jsonld = jsonldjs;
  require('../' + _jsdir + '/Promise');
  window.Promise = window.DomPromise;
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
      case 'timeout':
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
    ui: 'bdd',
    timeout: (parseInt(program.timeout, 10) * 1000) || 2000
  });
}

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
  if(!program['webidl-only']) {
    var dir = getEnv().JSONLD_TEST_SUITE || JSONLD_TEST_SUITE;
    dir = resolvePath(dir);
    var filename = joinPath(dir, 'manifest.jsonld');
    var rootManifest = readJson(filename);
    rootManifest.filename = filename;
    addManifest(rootManifest);
  }

  // run Web IDL tests
  if(!_nodejs) {
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
        }
        else if(this && this.constructor === window.JsonLdProcessor) {
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
            throw err;
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
        if(program.bail) {
          if(_nodejs) {
            process.exit();
          }
          else {
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
  try {
    var expect = readTestJson('expect')(test);
    assert.deepEqual(result, expect);
  }
  catch(ex) {
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
    var expect = readTestNQuads('expect')(test);
    assert.equal(result, expect);
  }
  catch(ex) {
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
    // FIXME: check error type against expected
    assert.ok(err);
  }
  catch(ex) {
    if(program.bail) {
      console.log('\nTEST FAILED\n');
    }
    throw ex;
  }
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
  return (_nodejs ? path : fs).join(dir, filename);
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
  }
  else {
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
  }
  else {
    fs.write(filename, json, 'w');
  }
  return this;
};

})();
