/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const types = require('./types');
// TODO: move `IdentifierIssuer` to its own package
const IdentifierIssuer = require('rdf-canonize').IdentifierIssuer;
const JsonLdError = require('./JsonLdError');

// constants
const REGEX_LINK_HEADERS = /(?:<[^>]*?>|"[^"]*?"|[^,])+/g;
const REGEX_LINK_HEADER = /\s*<([^>]*?)>\s*(?:;\s*(.*))?/;
const REGEX_LINK_HEADER_PARAMS =
  /(.*?)=(?:(?:"([^"]*?)")|([^"]*?))\s*(?:(?:;\s*)|$)/g;

const DEFAULTS = {
  headers: {
    accept: 'application/ld+json, application/json'
  }
};

const api = {};
module.exports = api;
api.IdentifierIssuer = IdentifierIssuer;

// define setImmediate and nextTick
//// nextTick implementation with browser-compatible fallback ////
// from https://github.com/caolan/async/blob/master/lib/async.js

// capture the global reference to guard against fakeTimer mocks
const _setImmediate = typeof setImmediate === 'function' && setImmediate;

const _delay = _setImmediate ?
  // not a direct alias (for IE10 compatibility)
  fn => _setImmediate(fn) :
  fn => setTimeout(fn, 0);

if(typeof process === 'object' && typeof process.nextTick === 'function') {
  api.nextTick = process.nextTick;
} else {
  api.nextTick = _delay;
}
api.setImmediate = _setImmediate ? _delay : api.nextTick;

/**
 * Clones an object, array, or string/number. If a typed JavaScript object
 * is given, such as a Date, it will be converted to a string.
 *
 * @param value the value to clone.
 *
 * @return the cloned value.
 */
api.clone = function(value) {
  if(value && typeof value === 'object') {
    let rval;
    if(types.isArray(value)) {
      rval = [];
      for(let i = 0; i < value.length; ++i) {
        rval[i] = api.clone(value[i]);
      }
    } else if(types.isObject(value)) {
      rval = {};
      for(let key in value) {
        rval[key] = api.clone(value[key]);
      }
    } else {
      rval = value.toString();
    }
    return rval;
  }
  return value;
};

/**
 * Builds an HTTP headers object for making a JSON-LD request from custom
 * headers and asserts the `accept` header isn't overridden.
 *
 * @param headers an object of headers with keys as header names and values
 *          as header values.
 *
 * @return an object of headers with a valid `accept` header.
 */
api.buildHeaders = (headers = {}) => {
  const hasAccept = Object.keys(headers).some(
    h => h.toLowerCase() === 'accept');

  if(hasAccept) {
    throw new RangeError(
      'Accept header may not be specified; only "' +
      DEFAULTS.headers.accept + '" is supported.');
  }

  return Object.assign({'Accept': DEFAULTS.headers.accept}, headers);
};

/**
 * Parses a link header. The results will be key'd by the value of "rel".
 *
 * Link: <http://json-ld.org/contexts/person.jsonld>;
 * rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"
 *
 * Parses as: {
 *   'http://www.w3.org/ns/json-ld#context': {
 *     target: http://json-ld.org/contexts/person.jsonld,
 *     type: 'application/ld+json'
 *   }
 * }
 *
 * If there is more than one "rel" with the same IRI, then entries in the
 * resulting map for that "rel" will be arrays.
 *
 * @param header the link header to parse.
 */
api.parseLinkHeader = header => {
  const rval = {};
  // split on unbracketed/unquoted commas
  const entries = header.match(REGEX_LINK_HEADERS);
  for(var i = 0; i < entries.length; ++i) {
    let match = entries[i].match(REGEX_LINK_HEADER);
    if(!match) {
      continue;
    }
    const result = {target: match[1]};
    const params = match[2];
    while((match = REGEX_LINK_HEADER_PARAMS.exec(params))) {
      result[match[1]] = (match[2] === undefined) ? match[3] : match[2];
    }
    const rel = result['rel'] || '';
    if(Array.isArray(rval[rel])) {
      rval[rel].push(result);
    } else if(rel in rval) {
      rval[rel] = [rval[rel], result];
    } else {
      rval[rel] = result;
    }
  }
  return rval;
};

/**
 * Throws an exception if the given value is not a valid @type value.
 *
 * @param v the value to check.
 */
api.validateTypeValue = v => {
  // can be a string or an empty object
  if(types.isString(v) || types.isEmptyObject(v)) {
    return;
  }

  // must be an array
  var isValid = false;
  if(types.isArray(v)) {
    // must contain only strings
    isValid = true;
    for(var i = 0; i < v.length; ++i) {
      if(!(types.isString(v[i]))) {
        isValid = false;
        break;
      }
    }
  }

  if(!isValid) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; "@type" value must a string, an array of ' +
      'strings, or an empty object.', 'jsonld.SyntaxError',
      {code: 'invalid type value', value: v});
  }
};

// TODO: remove once Promise API is fixed

/**
 * Converts a node.js async op into a promise w/boxed resolved value(s).
 *
 * @param op the operation to convert.
 *
 * @return the promise.
 */
api.promisify = function(op) {
  const args = Array.prototype.slice.call(arguments, 1);
  return new Promise((resolve, reject) => {
    op.apply(null, args.concat((err, value) => {
      if(!err) {
        resolve(value);
      } else {
        reject(err);
      }
    }));
  });
};
