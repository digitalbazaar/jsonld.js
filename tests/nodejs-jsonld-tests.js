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
};

TestRunner.prototype.check = function(expect, result) {
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
    ++g.count;
  }
  line += '/' + g.tests.pop();

  try {
    assert.deepEqual(expect, result);
    line += '... PASS';
  }
  catch(ex) {
    line += '... FAIL';
    var fail = true;
  }

  util.puts(line);
  if(fail) {
    util.puts('Expect: ' + util.inspect(expect, false, 10));
    util.puts('Result: ' + util.inspect(result, false, 10));

    // FIXME: remove me
    throw 'FAIL';
  }
}

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
      // FIXME: remove me, only do expand tests
      if(file.indexOf('expand') === -1) {
        util.log('Skipping manifest: "' + file + '"');
        continue;
      }
      util.log('Reading test file: "' + file + '"');

      try {
        var manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
      }
      catch(e) {
        util.log('Exception while parsing file: ' + file);
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
    util.log('Exception while parsing file: ' + file);
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
      // read test input files
      var result;
      var type = test['@type'];
      if(type.indexOf('jld:NormalizeTest') !== -1) {
        input = _readTestJson(test.input, filepath);
        test.expect = _readTestJson(test.expect, filepath);
        jsonld.normalize(input, checkResult);
      }
      else if(type.indexOf('jld:ExpandTest') !== -1) {
        input = _readTestJson(test.input, filepath);
        test.expect = _readTestJson(test.expect, filepath);
        jsonld.expand(input, checkResult);
      }
      else if(type.indexOf('jld:CompactTest') !== -1) {
        input = _readTestJson(test.input, filepath);
        test.context = _readTestJson(test.context, filepath);
        test.expect = _readTestJson(test.expect, filepath);
        jsonld.compact(test.context['@context'], input, checkResult);
      }
      else if(type.indexOf('jld:FrameTest') !== -1) {
        input = _readTestJson(test.input, filepath);
        test.frame = _readTestJson(test.frame, filepath);
        test.expect = _readTestJson(test.expect, filepath);
        jsonld.frame(input, test.frame, checkResult);
      }
      else {
        util.log('Skipping test "' + test.name + '" of type: ' +
          JSON.stringify(type));
        return callback();
      }

      // check results
      function checkResult(err, result) {
        if(err) {
          throw err;
        }
        self.test(test.name);
        self.check(test.expect, result);
        callback(null);
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
    util.log('All tests complete.');
  });
}
catch(e) {
  util.puts(e.stack);
  util.puts(util.inspect(e));
}
