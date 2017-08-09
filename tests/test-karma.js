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
  const _top = process.env.TEST_ROOT_DIR;
  // TODO: support just adding certain entries in EARL mode
  // json-ld.org main test suite
  // FIXME: add path detection
  entries.push(join(_top, 'test-suites/json-ld.org/test-suite'));
  entries.push(join(_top, '../json-ld.org/test-suite'));

  // json-ld.org normalization test suite
  // FIXME: add path detection
  entries.push(join(_top, 'test-suites/normalization/tests'));
  entries.push(join(_top, '../normalization/tests'));

  // other tests
  entries.push(join(_top, 'tests/new-embed-api'));

  // WebIDL tests
  entries.push(webidl)
}

const options = {
  nodejs: false,
  assert: assert,
  jsonld: jsonld,
  exit: code => {
    // FIXME: karma phantomjs does not expose this API
    if(window.phantom && window.phantom.exit) {
      return phantom.exit();
    }
    console.error('exit not implemented');
    throw new Error('exit not implemented');
  },
  earl: {
    id: 'browser',
    filename: process.env.EARL
  },
  bailOnError: process.env.BAIL === 'true',
  entries: entries,
  readFile: filename => {
    return server.run(filename, function(filename) {
      var fs = serverRequire('fs-extra');
      return fs.readFile(filename, 'utf8').then(data => {
        return data;
      });
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
  // FIXME: karma phantomjs does not expose this API
  if(window.phantom && window.phantom.exit) {
    phantom.exit(0);
  }
}).catch(err => {
  console.error(err);
  // FIXME: karma phantomjs does not expose this API
  if(window.phantom && window.phantom.exit) {
    phantom.exit(0);
  }
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
