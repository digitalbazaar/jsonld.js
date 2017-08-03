/**
 * Karma test runner for jsonld.js.
 *
 * Use environment vars to control, set via karma.conf.js/webpack:
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
// FIXME: hack to ensure delay is set first
mocha.setup({delay: true, ui: 'bdd'});

const assert = require('chai').assert;
const common = require('./test-common');
const jsonld = require('..');
const server = require('karma-server-side');
const webidl = require('./test-webidl');
const join = require('join-path-js');

const entries = [];

if(process.env.JSONLD_TESTS) {
  entries.push(...process.env.JSONLD_TESTS.split(' '));
} else {
  const testRootDir = process.env.TEST_ROOT_DIR;
  // TODO: support just adding certain entries in EARL mode
  entries.push(
    join(testRootDir, '../json-ld.org/test-suite'),
    join(testRootDir, '../normalization/tests'),
    join(testRootDir, 'tests/new-embed-api'),
    webidl,
  );
}

const options = {
  nodejs: false,
  assert: assert,
  jsonld: jsonld,
  exit: code => {
    if(phantom.exit) {
      return phantom.exit();
    }
    console.error('exit not implemented');
    throw new Error('exit not implemented');
  },
  earl: {
    id: 'browser',
    filename: process.env.EARL
  },
  bailOnError: false, // FIXME
  entries: entries,
  readFile: filename => {
    return server.run(filename, function(filename) {
      var fs = serverRequire('fs-extra');
      return fs.readFile(filename, 'utf8').then(data => {
        return data;
      }).catch(e => console.error(e));
    });
  },
  writeFile: (filename, data) => {
    return server.run(filename, data, function(filename, data) {
      var fs = serverRequire('fs-extra');
      return fs.outputFile(filename, data);
    });
  },
  import: f => { console.error('import not implemented'); }
};

// wait for setup of all tests then run mocha
common(options).then(() => {
  run();
}).then(() => {
  if(phantom.exit) {
    phantom.exit();
  }
}).catch(err => {
  console.error(err);
});

/* FIXME: old phantomjs support
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

  var fs = require('graceful-fs');
  var system = require('system');
  require('./setImmediate');
  var _jsdir = getEnv().JSDIR || 'lib';
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
*/
