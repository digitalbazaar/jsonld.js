/**
 * Node.js unit tests for JSON-LD.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2011-2013 Digital Bazaar, Inc. All rights reserved.
 */

'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var util = require('util');
var _jsdir = process.env.JSDIR || 'js';
var jsonld = require('../' + _jsdir + '/jsonld')();
require('../' + _jsdir + '/Future');

var JSONLD_TEST_SUITE = '../json-ld.org/test-suite';

var today = new Date();
today = today.getFullYear() + '-' +
  (today.getMonth() < 9 ?
    '0' + (today.getMonth() + 1) : today.getMonth() + 1) + '-' +
  (today.getDate() < 10 ? '0' + today.getDate() : today.getDate());
var earl = {
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
  'doap:license': 'https://github.com/digitalbazaar/jsonld.js/blob/master/LICENSE',
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

function expandedEqual(x, y, isList) {
  if(x === y) {
    return true;
  }
  if(typeof x !== typeof y) {
    return false;
  }
  if(Array.isArray(x)) {
    if(!Array.isArray(y) || x.length !== y.length) {
      return false;
    }
    var rval = true;
    if(isList) {
      // compare in order
      for(var i = 0; rval && i < x.length; ++i) {
        rval = expandedEqual(x, y, false);
      }
    }
    else {
      // compare in any order
      var iso = {};
      for(var i = 0; rval && i < x.length; ++i) {
        rval = false;
        for(var j = 0; !rval && j < y.length; ++j) {
          if(!(j in iso)) {
            if(expandedEqual(x[i], y[j], false)) {
              iso[j] = i;
              rval = true;
            }
          }
        }
      }
      rval = rval && Object.keys(iso).length === x.length;
    }
    return rval;
  }
  if(typeof x === 'object') {
    var xKeys = Object.keys(x);
    var yKeys = Object.keys(y);
    if(xKeys.length !== yKeys.length) {
      return false;
    }

    for(var key in x) {
      if(!(key in y)) {
        return false;
      }
      if(!expandedEqual(x[key], y[key], key === '@list')) {
        return false;
      }
    }
    return true;
  }

  return false;
}

function check(test, expect, result, done) {
  var earlAssertion = null;
  if(test._earl) {
    earlAssertion = {
      '@type': 'earl:Assertion',
      'earl:assertedBy': earl['doap:developer']['@id'],
      'earl:mode': 'earl:automatic',
      'earl:test': test['@id'],
      'earl:result': {
        '@type': 'earl:TestResult',
        'dc:date': new Date().toISOString()
      }
    };
    earl.subjectOf.push(earlAssertion);
  }

  var type = test['@type'];
  var expanded = (
    type.indexOf('jld:ExpandTest') !== -1 ||
    type.indexOf('jld:FlattenTest') !== -1);

  try {
    assert.equal(expect.constructor, result.constructor);
    if(expanded) {
      assert(expandedEqual(expect, result));
    }
    assert.deepEqual(expect, result);
    if(test._earl) {
      earlAssertion['earl:result']['earl:outcome'] = 'earl:passed';
    }
    done();
  }
  catch(ex) {
    var expectedJson = JSON.stringify(expect, null, 2);
    var resultJson = JSON.stringify(result, null, 2);
    ex.expected = expectedJson;
    ex.actual = resultJson;
    /*console.log('Test FAILED: ' + test.input);
    console.log('Expect:');
    console.log(expectedJson);
    console.log('Result:');
    console.log(resultJson);
    process.exit();*/
    if(test._earl) {
      earlAssertion['earl:result']['earl:outcome'] = 'earl:failed';
    }
    done(ex);
  }
}

function load(path_) {
  var manifests = [];
  var stat = fs.statSync(path_);

  if(stat.isFile()) {
    //util.log('Reading manifest from: "' + path_ + '"');
    var manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(path_, 'utf8'));
    }
    catch(e) {
      //util.log('Exception while parsing manifest: ' + path_);
      throw e;
    }
    manifest._path = path_;
    manifests.push(manifest);
  }
  else if(stat.isDirectory()) {
    //util.log('Reading manifests from: "' + path_ + '"');
    // read each test file from the directory
    var files = fs.readdirSync(path_);
    for(var i in files) {
      // TODO: read manifests as JSON-LD, process cleanly, this is hacked
      //var file = path.join(filepath, files[i]);
      var file = files[i];
      if(file.indexOf('manifest') !== -1 && path.extname(file) == '.jsonld') {
        //util.log('Reading manifest: "' + file + '"');
        var subpath = path.join(path_, file);
        manifests.push.apply(manifests, load(subpath));
      }
    }
  }
  else {
    throw new Error('Unhandled path type: ' + path);
  }

  //util.log(manifests.length + ' manifests read: ' + path_);

  return manifests;
}

/**
 * Reads a file.
 *
 * @param dir the test dir (optional)
 * @param path_ the file to read.
 *
 * @return the read JSON.
 */
var _readTestData = function(dir, path_) {
  try {
    if(!path_) {
      path_ = dir;
      dir = null;
    }
    if(dir) {
      path_ = path.join(dir, path_);
    }
    return fs.readFileSync(path_, 'utf8');
  }
  catch(e) {
    util.log('Exception reading test test file: ' + path_);
    throw e;
  }
};

/**
 * Reads test JSON files.
 *
 * @param dir the test dir (optional)
 * @param path the file to read.
 *
 * @return the read JSON.
 */
var _readTestJson = function(dir, path) {
  try {
    return JSON.parse(_readTestData(dir, path));
  }
  catch(e) {
    util.log('Exception while parsing JSON test file: ' + path);
    throw e;
  }
};

/**
 * Reads test N-Quads files.
 *
 * @param dir the test dir (optional)
 * @param path the file to read.
 *
 * @return the read N-Quads.
 */
var _readTestNQuads = function(dir, path) {
  return _readTestData(dir, path);
};

/**
 * Run a manifest test file, array, or object.
 *
 * @param manifest the manifest path, array, or object.
 * @param src the source manifest (optional)
 */
function run(manifest, src) {
  /* Manifest format:
       {
         name: <optional manifest name>,
         sequence: [test | string]
       }

     string: another manifest to load and run.
     test format:
       {
         'name': <test name>,
         '@type': ['test:TestCase', 'jld:<type of test>'],
         'input': <input file for test>,
         'context': <context file for add context test type>,
         'frame': <frame file for frame test type>,
         'expect': <expected result file>,
       }
  */
  if(typeof manifest === 'string') {
    if(src) {
      manifest = path.join(path.dirname(src._path), manifest);
    }
    run(load(manifest), src);
  }
  else if(Array.isArray(manifest)) {
    manifest.forEach(function(el) {
      run(el, src);
    });
  }
  else if(typeof manifest === 'object') {
    if(!manifest.name) {
      throw new Error('Unnamed test found: ' +
        JSON.stringify(manifest, null, 2));
    }
    if(manifest['@type'].indexOf('mf:Manifest') !== -1) {
      describe(manifest.name, function() {
        manifest.sequence.forEach(function(el) {
          run(el, manifest);
        });
      });
    }
    else {
      // run with regular and futures API
      _run(manifest, src);
      _run_future(manifest, src);
    }
  }
  else {
    throw new Error('Unknown manifest type: ' + typeof manifest);
  }
  return;
}

/**
 * Run a test.
 *
 * @param test the test specification object.
 * @param src the source manifest (optional)
 */
function _run(test, src) {
  // read test input files
  var type = test['@type'];
  var options = {};
  options.useNativeTypes = true;
  var idBase = '';
  if(src) {
    options.base = src.baseIri + test.input;
    idBase = src.baseIri + path.basename(src._path);
  }
  var dir = src ? path.dirname(src._path) : null;

  // check results
  var checkResult = function(expect, done) {
    return function(err, result) {
      if(err) {
        earl.subjectOf.push({
          '@type': 'earl:Assertion',
          'earl:assertedBy': earl['doap:developer']['@id'],
          'earl:mode': 'earl:automatic',
          'earl:test': test['@id'],
          'earl:result': {
            '@type': 'earl:TestResult',
            'dc:date': new Date().toISOString(),
            'earl:outcome': 'earl:failed'
          }
        });
        return done(err);
      }
      test['@id'] = idBase + test['@id'];
      test._earl = true;
      check(test, expect, result, done);
    };
  };

  it(test.name, function(done) {
    if(type.indexOf('jld:ApiErrorTest') !== -1) {
      util.log('Skipping test "' + test.name + '" of type: ' +
        JSON.stringify(type));
      done();
    }
    else if(type.indexOf('jld:NormalizeTest') !== -1) {
      var input = _readTestJson(dir, test.input);
      var expect = _readTestNQuads(dir, test.expect);
      options.format = 'application/nquads';
      jsonld.normalize(input, options, checkResult(expect, done));
    }
    else if(type.indexOf('jld:ExpandTest') !== -1) {
      var input = _readTestJson(dir, test.input);
      var expect = _readTestJson(dir, test.expect);
      jsonld.expand(input, options, checkResult(expect, done));
    }
    else if(type.indexOf('jld:CompactTest') !== -1) {
      var input = _readTestJson(dir, test.input);
      var context = _readTestJson(dir, test.context);
      var expect = _readTestJson(dir, test.expect);
      jsonld.compact(input, context, options, checkResult(expect, done));
    }
    else if(type.indexOf('jld:FlattenTest') !== -1) {
      var input = _readTestJson(dir, test.input);
      var expect = _readTestJson(dir, test.expect);
      jsonld.flatten(input, null, options, checkResult(expect, done));
    }
    else if(type.indexOf('jld:FrameTest') !== -1) {
      var input = _readTestJson(dir, test.input);
      var frame = _readTestJson(dir, test.frame);
      var expect = _readTestJson(dir, test.expect);
      jsonld.frame(input, frame, options, checkResult(expect, done));
    }
    else if(type.indexOf('jld:FromRDFTest') !== -1) {
      var input = _readTestNQuads(dir, test.input);
      var expect = _readTestJson(dir, test.expect);
      jsonld.fromRDF(input, options, checkResult(expect, done));
    }
    else if(type.indexOf('jld:ToRDFTest') !== -1) {
      var input = _readTestJson(dir, test.input);
      var expect = _readTestNQuads(dir, test.expect);
      options.format = 'application/nquads';
      jsonld.toRDF(input, options, checkResult(expect, done));
    }
    else {
      util.log('Skipping test "' + test.name + '" of type: ' +
        JSON.stringify(type));
      done();
    }
  });
}

/**
 * Run a test using the futures API.
 *
 * @param test the test specification object.
 * @param src the source manifest (optional)
 */
function _run_future(test, src) {
  // read test input files
  var type = test['@type'];
  var options = {};
  options.useNativeTypes = true;
  if(src) {
    options.base = src.baseIri + test.input;
  }
  var dir = src ? path.dirname(src._path) : null;

  // check results
  var checkResult = function(expect, done) {
    return function(result) {
      check(test, expect, result, done);
    };
  };

  var futures = jsonld.futures();
  it(test.name, function(done) {
    if(type.indexOf('jld:ApiErrorTest') !== -1) {
      util.log('Skipping test "' + test.name + '" of type: ' +
        JSON.stringify(type));
    }
    else if(type.indexOf('jld:NormalizeTest') !== -1) {
      var input = _readTestJson(dir, test.input);
      var expect = _readTestNQuads(dir, test.expect);
      options.format = 'application/nquads';
      futures.normalize(input, options).done(checkResult(expect, done), done);
    }
    else if(type.indexOf('jld:ExpandTest') !== -1) {
      var input = _readTestJson(dir, test.input);
      var expect = _readTestJson(dir, test.expect);
      futures.expand(input, options).done(checkResult(expect, done), done);
    }
    else if(type.indexOf('jld:CompactTest') !== -1) {
      var input = _readTestJson(dir, test.input);
      var context = _readTestJson(dir, test.context);
      var expect = _readTestJson(dir, test.expect);
      futures.compact(input, context, options).done(
        checkResult(expect, done), done);
    }
    else if(type.indexOf('jld:FlattenTest') !== -1) {
      var input = _readTestJson(dir, test.input);
      var expect = _readTestJson(dir, test.expect);
      futures.flatten(input, null, options).done(
        checkResult(expect, done), done);
    }
    else if(type.indexOf('jld:FrameTest') !== -1) {
      var input = _readTestJson(dir, test.input);
      var frame = _readTestJson(dir, test.frame);
      var expect = _readTestJson(dir, test.expect);
      futures.frame(input, frame, options).done(
        checkResult(expect, done), done);
    }
    else if(type.indexOf('jld:FromRDFTest') !== -1) {
      var input = _readTestNQuads(dir, test.input);
      var expect = _readTestJson(dir, test.expect);
      futures.fromRDF(input, options).done(
        checkResult(expect, done), done);
    }
    else if(type.indexOf('jld:ToRDFTest') !== -1) {
      var input = _readTestJson(dir, test.input);
      var expect = _readTestNQuads(dir, test.expect);
      options.format = 'application/nquads';
      futures.toRDF(input, options).done(
        checkResult(expect, done), done);
    }
    else {
      util.log('Skipping test "' + test.name + '" of type: ' +
        JSON.stringify(type));
      done();
    }
  });
}

// run w/o mocha
/*if(typeof describe === 'undefined') {
  var describe = function(name, test) {
    console.log(name);
    test();
  };
}
if(typeof it === 'undefined') {
  var it = function(name, callback) {
    callback(function(err) {
      if(err) {
        console.log('Error', err);
      }
    });
  };
}*/

describe('JSON-LD', function() {
  var path =
    process.env.JSONLD_TEST_SUITE ||
    JSONLD_TEST_SUITE;
  run(path);
});

// FIXME: add command line params for outputting earl report
/*
describe('EARL report', function() {
  it('should print the earl report', function(done) {
    fs.writeFileSync('/tmp/jsonld.js-earl.jsonld',
      JSON.stringify(earl, null, 2));
    done();
  });
});*/
