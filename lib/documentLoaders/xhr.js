/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {parseLinkHeader, buildHeaders, promisify} = require('../util');
const {LINK_HEADER_REL} = require('../constants');
const JsonLdError = require('../JsonLdError');
const RequestQueue = require('../RequestQueue');

const REGEX_LINK_HEADER = /(^|(\r\n))link:/i;

/**
 * Creates a built-in XMLHttpRequest document loader.
 *
 * @param options the options to use:
 *          secure: require all URLs to use HTTPS.
 *          headers: an object (map) of headers which will be passed as request
 *            headers for the requested document. Accept is not allowed.
 *          usePromise: true to use a promises API, false for a
 *            callback-continuation-style API; defaults to true if Promise
 *            is globally defined, false if not.
 *          [xhr]: the XMLHttpRequest API to use.
 *
 * @return the XMLHttpRequest document loader.
 */
module.exports = ({
  secure,
  headers = {},
  usePromise = true,
  xhr
} = {}) => {
  headers = buildHeaders(headers);
  const queue = new RequestQueue();

  // TODO: simplify w/async

  // use option or, by default, use Promise when its defined
  if(usePromise) {
    return queue.wrapLoader(function(url) {
      return promisify(loader, url);
    });
  }
  return queue.wrapLoader(loader);

  function loader(url, callback) {
    if(url.indexOf('http:') !== 0 && url.indexOf('https:') !== 0) {
      return callback(new JsonLdError(
        'URL could not be dereferenced; only "http" and "https" URLs are ' +
        'supported.',
        'jsonld.InvalidUrl', {code: 'loading document failed', url: url}),
        {contextUrl: null, documentUrl: url, document: null});
    }
    if(secure && url.indexOf('https') !== 0) {
      return callback(new JsonLdError(
        'URL could not be dereferenced; secure mode is enabled and ' +
        'the URL\'s scheme is not "https".',
        'jsonld.InvalidUrl', {code: 'loading document failed', url: url}),
        {contextUrl: null, documentUrl: url, document: null});
    }
    xhr = xhr || XMLHttpRequest;
    const req = new xhr();
    req.onload = function() {
      if(req.status >= 400) {
        return callback(new JsonLdError(
          'URL could not be dereferenced: ' + req.statusText,
          'jsonld.LoadDocumentError', {
            code: 'loading document failed',
            url: url,
            httpStatusCode: req.status
          }), {contextUrl: null, documentUrl: url, document: null});
      }

      const doc = {contextUrl: null, documentUrl: url, document: req.response};

      // handle Link Header (avoid unsafe header warning by existence testing)
      const contentType = req.getResponseHeader('Content-Type');
      let linkHeader;
      if(REGEX_LINK_HEADER.test(req.getAllResponseHeaders())) {
        linkHeader = req.getResponseHeader('Link');
      }
      if(linkHeader && contentType !== 'application/ld+json') {
        // only 1 related link header permitted
        linkHeader = parseLinkHeader(linkHeader)[LINK_HEADER_REL];
        if(Array.isArray(linkHeader)) {
          return callback(new JsonLdError(
            'URL could not be dereferenced, it has more than one ' +
            'associated HTTP Link Header.',
            'jsonld.InvalidUrl',
            {code: 'multiple context link headers', url: url}), doc);
        }
        if(linkHeader) {
          doc.contextUrl = linkHeader.target;
        }
      }

      callback(null, doc);
    };
    req.onerror = function() {
      callback(new JsonLdError(
        'URL could not be dereferenced, an error occurred.',
        'jsonld.LoadDocumentError',
        {code: 'loading document failed', url: url}),
        {contextUrl: null, documentUrl: url, document: null});
    };
    req.open('GET', url, true);

    for(let k in headers) {
      req.setRequestHeader(k, headers[k]);
    }

    req.send();
  }
};
