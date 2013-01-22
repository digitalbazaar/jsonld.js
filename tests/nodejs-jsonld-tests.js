/**
 * Node.js unit tests for JSON-LD.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2011-2012 Digital Bazaar, Inc. All rights reserved.
 */
var assert = require('assert');
var async = require('async');
var fs = require('fs');
var path = require('path');
var util = require('util');
var jsonld = require('../js/jsonld');

function TestRunner() {
  // set up groups, add root group
  this.groups = [];
  this.group('');

  this.passed = 0;
  this.failed = 0;
  this.total = 0;
};

TestRunner.prototype.group = function(name) {
  this.groups.push( {
    name: name,
    tests: [],
    count: 1
  });
};

TestRunner.prototype.ungroup = function() {
  this.groups.pop();
};

TestRunner.prototype.test = function(name) {
  this.groups[this.groups.length - 1].tests.push(name);
  this.total += 1;

  var line = '';
  for(var i in this.groups) {
    var g = this.groups[i];
    line += (line === '') ? g.name : ('/' + g.name);
  }

  var g = this.groups[this.groups.length - 1];
  if(g.name !== '') {
    var count = '' + g.count;
    var end = 4 - count.length;
    for(var i = 0; i < end; ++i) {
      count = '0' + count;
    }
    line += ' ' + count;
    g.count += 1;
  }
  line += '/' + g.tests.pop() + '... ';
  process.stdout.write(line);
};

TestRunner.prototype.expandedEqual = function(x, y, isList) {
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
        rval = this.expandedEqual(x, y, false);
      }
    }
    else {
      // compare in any order
      var iso = {};
      for(var i = 0; rval && i < x.length; ++i) {
        rval = false;
        for(var j = 0; !rval && j < y.length; ++j) {
          if(!(j in iso)) {
            if(this.expandedEqual(x[i], y[j])) {
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
  else if(typeof x === 'object') {
    var xKeys = Object.keys(x).sort();
    var yKeys = Object.keys(y).sort();
    if(xKeys.length !== yKeys.length) {
      return false;
    }

    for(var key in x) {
      if(!(key in y)) {
        return false;
      }
      if(!this.expandedEqual(x[key], y[key], key === '@list')) {
        return false;
      }
    }
    return true;
  }

  return false;
};

TestRunner.prototype.check = function(test, expect, result, expanded) {
  var line = '';
  var pass = false;
  try {
    assert.deepEqual(expect, result);
    pass = true;
  }
  catch(ex) {
    pass = expanded && this.expandedEqual(expect, result);
  }
  finally {
    if(pass) {
      line += 'PASS';
      this.passed += 1;
    }
    else {
      line += 'FAIL';
      this.failed += 1;
    }
  }

  console.log(line);
  if(!pass) {
    console.log('Expect:');
    console.log(JSON.stringify(expect, null, 2));
    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));
  }
};

TestRunner.prototype.load = function(filepath) {
  var manifests = [];

  // get full path
  filepath = fs.realpathSync(filepath);
  util.log('Reading test files from: "' + filepath + '"');

  // read each test file from the directory
  var files = fs.readdirSync(filepath);
  for(var i in files) {
    // TODO: read manifests as JSON-LD, process cleanly, this is hacked
    var file = path.join(filepath, files[i]);
    if(file.indexOf('manifest') !== -1 && path.extname(file) == '.jsonld') {
      util.log('Reading manifest file: "' + file + '"');

      try {
        var manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
      }
      catch(e) {
        util.log('Exception while parsing manifest file: ' + file);
        throw e;
      }

      manifest.filepath = filepath;
      manifests.push(manifest);
    }
  }

  util.log(manifests.length + ' manifest file(s) read');

  return manifests;
};

/**
 * Reads test JSON files.
 *
 * @param file the file to read.
 * @param filepath the test filepath.
 *
 * @return the read JSON.
 */
var _readTestJson = function(file, filepath) {
  var rval;

  try {
    file = path.join(filepath, file);
    rval = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  catch(e) {
    util.log('Exception while parsing test file: ' + file);
    throw e;
  }

  return rval;
};

/**
 * Reads test N-Quads files.
 *
 * @param file the file to read.
 * @param filepath the test filepath.
 *
 * @return the read N-Quads.
 */
var _readTestNQuads = function(file, filepath) {
  var rval;

  try {
    file = path.join(filepath, file);
    rval = fs.readFileSync(file, 'utf8');
  }
  catch(e) {
    util.log('Exception while parsing test file: ' + file);
    throw e;
  }

  return rval;
};

TestRunner.prototype.run = function(manifests, callback) {
  /* Manifest format: {
       name: <optional manifest name>,
       sequence: [{
         'name': <test name>,
         '@type': ["test:TestCase", "jld:<type of test>"],
         'input': <input file for test>,
         'context': <context file for add context test type>,
         'frame': <frame file for frame test type>,
         'expect': <expected result file>,
       }]
     }
   */
  var self = this;
  async.forEachSeries(manifests, function(manifest, callback) {
    var filepath = manifest.filepath;
    if('name' in manifest) {
      self.group(manifest.name);
    }

    async.forEachSeries(manifest.sequence, function(test, callback) {
      try {
        // read test input files
        var type = test['@type'];
        var options = {
          base: 'http://json-ld.org/test-suite/tests/' + test.input
        };

        // check results
        var checkResult = function(err, result) {
          // skip error, go onto next test
          if(err) {
            console.log('EXCEPTION');
            self.failed += 1;
            outputError(err);
            return callback();
          }
          self.check(
            test, test.expect, result, type.indexOf('jld:ExpandTest') !== -1);
          callback();
        };

        if(type.indexOf('jld:ApiErrorTest') !== -1) {
          util.log('Skipping test "' + test.name + '" of type: ' +
            JSON.stringify(type));
          return callback();
        }
        else if(type.indexOf('jld:NormalizeTest') !== -1) {
          self.test(test.name);
          input = _readTestJson(test.input, filepath);
          test.expect = _readTestNQuads(test.expect, filepath);
          options.format = 'application/nquads';
          jsonld.normalize(input, options, checkResult);
        }
        else if(type.indexOf('jld:ExpandTest') !== -1) {
          self.test(test.name);
          input = _readTestJson(test.input, filepath);
          test.expect = _readTestJson(test.expect, filepath);
          jsonld.expand(input, options, checkResult);
        }
        else if(type.indexOf('jld:CompactTest') !== -1) {
          self.test(test.name);
          input = _readTestJson(test.input, filepath);
          test.context = _readTestJson(test.context, filepath);
          test.expect = _readTestJson(test.expect, filepath);
          options.optimize = test.optimize || false;
          jsonld.compact(input, test.context, options, checkResult);
        }
        else if(type.indexOf('jld:FlattenTest') !== -1) {
          self.test(test.name);
          input = _readTestJson(test.input, filepath);
          test.expect = _readTestJson(test.expect, filepath);
          jsonld.flatten(input, checkResult);
        }
        else if(type.indexOf('jld:FrameTest') !== -1) {
          self.test(test.name);
          input = _readTestJson(test.input, filepath);
          test.frame = _readTestJson(test.frame, filepath);
          test.expect = _readTestJson(test.expect, filepath);
          jsonld.frame(input, test.frame, options, checkResult);
        }
        else if(type.indexOf('jld:FromRDFTest') !== -1) {
          self.test(test.name);
          input = _readTestNQuads(test.input, filepath);
          test.expect = _readTestJson(test.expect, filepath);
          jsonld.fromRDF(input, options, checkResult);
        }
        else if(type.indexOf('jld:ToRDFTest') !== -1) {
          self.test(test.name);
          input = _readTestJson(test.input, filepath);
          test.expect = _readTestNQuads(test.expect, filepath);
          options.format = 'application/nquads';
          options.collate = true;
          jsonld.toRDF(input, options, checkResult);
        }
        else {
          util.log('Skipping test "' + test.name + '" of type: ' +
            JSON.stringify(type));
          return callback();
        }
      }
      catch(ex) {
        callback(ex);
      }
    }, function(err) {
      if(err) {
        return callback(err);
      }
      if('name' in manifest) {
        self.ungroup();
      }
      callback();
    });
  }, function(err) {
    callback(err);
  });
};

function outputError(err) {
  console.log();
  if(err.stack !== undefined) {
    console.log(err.stack);
  }
  else {
    console.log(err);
  }
  if('details' in err) {
    console.log(util.inspect(err, false, 10));
  }
}

// load and run tests
try {
  var tr = new TestRunner();
  tr.group('JSON-LD');
  // FIXME: use commander module
  if(process.argv.length < 2) {
    throw 'Usage: node nodejs-jsonld-tests <test directory>';
  }
  var dir = process.argv[2];
  tr.run(tr.load(dir), function(err) {
    if(err) {
      throw err;
    }
    tr.ungroup();
    console.log(util.format('Done. Total:%s Passed:%s Failed:%s',
      tr.total, tr.passed, tr.failed));
  });
}
catch(ex) {
  outputError(ex);
}
