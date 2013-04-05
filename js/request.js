#!/usr/bin/env node
/**
 * JSON-LD extension to load JSON-LD from stdin, a URL, or a file.
 *
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 *
 * BSD 3-Clause License
 * Copyright (c) 2013 Digital Bazaar, Inc.
 * All rights reserved.
 */

'use strict';

var fs = require('fs');
var jsonld = require('./jsonld');

try {
  var request = require('request');
} catch(e) {
  // skip URL fetching when request is missing
}

try {
  var jsdom = require('jsdom');
  var RDFa = require('../js/rdfa');
} catch(e) {
  // skip RDFa parsing if is libs missing
}

/**
 * Clones an object, array, or string/number.
 *
 * @param value the value to clone.
 *
 * @return the cloned value.
 */
function _clone(value) {
  if(value && typeof value === 'object') {
    var rval = Array.isArray(value) ? [] : {};
    for(var i in value) {
      rval[i] = _clone(value[i]);
    }
    return rval;
  }
  return value;
}

/**
 * Request JSON-LD data from a location. Fetching remote resources depends on
 * the node 'request' module. Parsing of RDFa depends on the jsdom and
 * green-turtle RDFa modules.
 *
 * @param loc the location of the resource, one of the following:
 *        falsey or -: to read data from stdin.
 *        URL: URL string beginning with 'http://' or 'https://'.
 *        *: a filename
 * @param options request options [optional]
 *        URLs: see node 'request' module
 *        stdin and files:
 *          encoding: input character encoding (default: 'utf-8')
 * @param callback function(err, data) called with error or a JSON object.
 */
function _request(loc, options, callback) {
  // handle missing optional options param
  if(typeof callback === 'undefined') {
    callback = options;
    options = {};
  }
  if(!loc || loc === '-') {
    // read from stdin
    options.encoding = options.encoding || 'utf-8';
    var data = '';
    process.stdin.resume();
    process.stdin.setEncoding(options.encoding);

    process.stdin.on('data', function(chunk) {
      data += chunk;
    });

    process.stdin.on('end', function() {
      callback(null, JSON.parse(data));
    });
  }
  else if(loc.indexOf('http://') === 0 || loc.indexOf('https://') === 0) {
    // read URL via request module
    if(typeof request === 'undefined') {
      callback({
        message: 'request module not found.',
        url: loc
      });
      return;
    }

    // setup request options
    var opts = _clone(options);

    // force method and url
    opts.method = 'GET';
    opts.url = loc;

    // set if not set
    if(!('strictSSL' in opts)) {
      opts.strictSSL = true;
    }
    opts.headers = opts.headers || {};
    if(!('Accept' in opts.headers)) {
      opts.headers.Accept =
        'application/ld+json; q=1.0, ' +
        'application/json; q=0.8, ' +
        'text/html; q=0.6, ' +
        'application/xhtml+xml; q=0.6';
    }

    request(opts, function(err, res, body) {
      if(err) {
        return callback(err);
      }
      if(!(res.statusCode >= 200 && res.statusCode < 300)) {
        return callback({
          message: 'Bad status code.',
          statusCode: res.statusCode,
          url: loc
        });
      }
      var ct = res.headers['content-type'];
      // grab part before ';'
      var type = (ct || '').split(';')[0];
      switch(type) {
        case 'application/ld+json':
        case 'application/json':
          callback(null, JSON.parse(body));
          break;
        case 'text/html':
        case 'application/xhtml+xml':
          if(typeof jsdom === 'undefined') {
            callback({
              message: 'jsdom module not found.',
              contentType: ct,
              url: loc
            });
            break;
          }
          if(typeof RDFa === 'undefined') {
            callback({
              message: 'RDFa module not found.',
              contentType: ct,
              url: loc
            });
            break;
          }
          // input is RDFa
          jsdom.env(body, function(errors, window) {
            if(errors && errors.length > 0) {
              return callback({
                message: 'DOM Errors:',
                errors: errors,
                url: loc
              });
            }

            try {
              // extract JSON-LD from RDFa
              RDFa.attach(window.document);
              jsonld.fromRDF(window.document.data,
                {format: 'rdfa-api'}, callback);
            }
            catch(ex) {
              callback(ex);
            }
          });
          break;
        default:
          callback({
            message: 'Unknown Content-Type.',
            contentType: ct,
            url: loc
          });
      }
    });
  }
  else {
    // read file
    options.encoding = options.encoding || 'utf-8';
    fs.readFile(loc, options.encoding, function(error, data) {
      if(error) {
        return callback(error);
      }
      callback(null, JSON.parse(data));
    });
  }
}

module.exports = _request;
