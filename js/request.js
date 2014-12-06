/**
 * JSON-LD extension to load JSON-LD from stdin, a URL, or a file.
 *
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 *
 * BSD 3-Clause License
 * Copyright (c) 2013 Digital Bazaar, Inc.
 * All rights reserved.
 */

(function() {

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
 * Parse data with given type.
 *
 * @param loc location string came from
 * @param type content type of the string
 * @param data the data string or buffer
 * @param callback function(err, data) called with errors and result data
 */
function _typedParse(loc, type, data, callback) {
  switch(type.toLowerCase()) {
    case 'text':
    case 'plain':
    case 'text/plain':
      callback(null, data);
      break;
    case 'json':
    case 'jsonld':
    case 'json-ld':
    case 'ld+json':
    case 'application/json':
    case 'application/ld+json':
      try {
        callback(null, JSON.parse(data));
      } catch(ex) {
        callback({
          message: 'Error parsing JSON.',
          contentType: type,
          url: loc,
          exception: ex.toString()
        });
      }
      break;
    case 'xml':
    case 'html':
    case 'xhtml':
    case 'text/html':
    case 'application/xhtml+xml':
      if(typeof jsdom === 'undefined') {
        callback({
          message: 'jsdom module not found.',
          contentType: type,
          url: loc
        });
        break;
      }
      if(typeof RDFa === 'undefined') {
        callback({
          message: 'RDFa module not found.',
          contentType: type,
          url: loc
        });
        break;
      }
      // input is RDFa
      try {
        jsdom.env({
          url: loc,
          html: data,
          done: function(errors, window) {
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
            } catch(ex) {
              // FIXME: expose RDFa/jsonld ex?
              callback({
                message: 'RDFa extraction error.',
                contentType: type,
                url: loc
              });
            }
          }
        });
      } catch(ex) {
        // FIXME: expose jsdom(?) ex?
        callback({
          message: 'jsdom error.',
          contentType: type,
          url: loc
        });
      }
      break;
    default:
      callback({
        message: 'Unknown Content-Type.',
        contentType: type,
        url: loc
      });
  }
}

// http://stackoverflow.com/questions/280634/endswith-in-javascript
function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

// check if data is a string or buffer sequence of data
function isSequence(data) {
  return typeof data === 'string' || Buffer.isBuffer(data);
}

/**
 * Parse data.
 *
 * @param loc location the data came from
 * @param type content type of the string or null to attempt to auto-detect
 * @param data the data string or buffer
 * @param callback function(err, data) called with errors and result data
 */
function _parse(loc, type, data, callback) {
  // empty string or buffer
  var seq = isSequence(data);
  if(seq && data.length === 0) {
    return callback(null, null);
  }
  // already parsed
  if(!seq && typeof data === 'object') {
    return callback(null, data);
  }
  // explicit type
  if(type && type !== 'auto') {
    return _typedParse(loc, type, data, callback);
  }
  // typed via text-like extension
  if(loc && (endsWith(loc, '.txt'))) {
    return _typedParse(loc, 'text', data, callback);
  }
  // typed via JSON-like extension
  if(loc && (endsWith(loc, '.json') ||
    endsWith(loc, '.jsonld') ||
    endsWith(loc, '.json-ld'))) {
    return _typedParse(loc, 'json', data, callback);
  }
  // typed via HTML-like extension
  if(loc && (endsWith(loc, '.xml') ||
    endsWith(loc, '.html') ||
    endsWith(loc, '.xhtml'))) {
    return _typedParse(loc, 'html', data, callback);
  }
  // try ~JSON
  _typedParse(loc, 'application/ld+json', data, function(err, data) {
    if(err) {
      // try ~HTML
      return _typedParse(loc, 'text/html', data, function(err, data) {
        if(err) {
          return callback({
            message: 'Unable to auto-detect format.',
            url: loc
          });
        }
        callback(null, data);
      });
    }
    callback(null, data);
  });
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
 *          encoding: input character encoding (default: 'utf8')
 *          dataType: data type to expect and use for parsing the response.
 *            omit or falsy to auto-detect. (default: auto)
 *          *: see node 'request' module options
 * @param callback function(err, res, data) called when done with possible
 *          error, http.ClientResponse for URLS else null, and the result
 *          data.
 */
function _request(loc, options, callback) {
  // handle missing optional options param
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  if(!loc || loc === '-') {
    // read from stdin
    var data = '';
    process.stdin.resume();
    process.stdin.setEncoding(options.encoding || 'utf8');

    process.stdin.on('data', function(chunk) {
      data += chunk;
    });

    process.stdin.on('end', function() {
      _parse(loc, options.dataType, data, function(err, data) {
        callback(err, null, data);
      });
    });
  } else if(loc.indexOf('http://') === 0 || loc.indexOf('https://') === 0) {
    // read URL via request module
    if(typeof request === 'undefined') {
      callback({
        message: 'request module not found.',
        url: loc
      });
      return;
    }

    // clone and setup request options
    var opts = _clone(options);
    opts.url = loc;
    opts.encoding = opts.encoding || 'utf8';
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
        var msg = {
          message: 'Bad status code.',
          statusCode: res.statusCode,
          url: loc
        };
        if(body) {
          // attempt to auto-parse error body
          return _parse(loc, null, body, function(err, data) {
            if(err) {
              // failed to parse, just use raw body
              data = body;
            }
            msg.body = data;
            callback(msg);
          });
        } else {
          return callback(msg);
        }
      }
      // done if no content
      if(!body || (isSequence(body) && body.length === 0)) {
        return callback(null, null, null);
      }
      var dataType =
        options.dataType ||
        // grab part before ';'
        (res.headers['content-type'] || '').split(';')[0];
      // parse content
      _parse(loc, dataType, body, function(err, data) {
        callback(err, res, data);
      });
    });
  } else {
    // read file
    var fileprefix = 'file://';
    if(loc.indexOf('file://') === 0) {
      loc = loc.substr(fileprefix.length);
    }
    fs.readFile(loc, options.encoding || 'utf8', function(error, data) {
      if(error) {
        return callback(error);
      }
      _parse(loc, options.type, data, function(err, data) {
        callback(err, null, data);
      });
    });
  }
}

module.exports = _request;

}());
