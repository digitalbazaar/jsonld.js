/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {parseLinkHeader, buildHeaders} = require('../util');
const {LINK_HEADER_CONTEXT} = require('../constants');
const JsonLdError = require('../JsonLdError');
const RequestQueue = require('../RequestQueue');
const {prependBase} = require('../url');

/**
 * Creates a built-in node document loader.
 *
 * @param options the options to use:
 *          secure: require all URLs to use HTTPS.
 *          strictSSL: true to require SSL certificates to be valid,
 *            false not to (default: true).
 *          maxRedirects: the maximum number of redirects to permit, none by
 *            default.
 *          request: the object which will make the request, default is
 *            provided by `https://www.npmjs.com/package/request`.
 *          headers: an object (map) of headers which will be passed as request
 *            headers for the requested document. Accept is not allowed.
 *
 * @return the node document loader.
 */
module.exports = ({
  secure,
  strictSSL = true,
  maxRedirects = -1,
  request,
  headers = {}
} = {strictSSL: true, maxRedirects: -1, headers: {}}) => {
  headers = buildHeaders(headers);
  // TODO: use `axios`
  request = request || require('request');
  const http = require('http');

  const queue = new RequestQueue();
  return queue.wrapLoader(function(url) {
    return loadDocument(url, []);
  });

  async function loadDocument(url, redirects) {
    if(url.indexOf('http:') !== 0 && url.indexOf('https:') !== 0) {
      throw new JsonLdError(
        'URL could not be dereferenced; only "http" and "https" URLs are ' +
        'supported.',
        'jsonld.InvalidUrl', {code: 'loading document failed', url});
    }
    if(secure && url.indexOf('https') !== 0) {
      throw new JsonLdError(
        'URL could not be dereferenced; secure mode is enabled and ' +
        'the URL\'s scheme is not "https".',
        'jsonld.InvalidUrl', {code: 'loading document failed', url});
    }
    // TODO: disable cache until HTTP caching implemented
    let doc = null;//cache.get(url);
    if(doc !== null) {
      return doc;
    }

    let result;
    let alternate = null;
    try {
      result = await _request(request, {
        url,
        headers,
        strictSSL,
        followRedirect: false
      });
    } catch(e) {
      throw new JsonLdError(
        'URL could not be dereferenced, an error occurred.',
        'jsonld.LoadDocumentError',
        {code: 'loading document failed', url, cause: e});
    }

    const {res, body} = result;

    doc = {contextUrl: null, documentUrl: url, document: body || null};

    // handle error
    const statusText = http.STATUS_CODES[res.statusCode];
    if(res.statusCode >= 400) {
      throw new JsonLdError(
        `URL "${url}" could not be dereferenced: ${statusText}`,
        'jsonld.InvalidUrl', {
          code: 'loading document failed',
          url,
          httpStatusCode: res.statusCode
        });
    }

    // handle Link Header
    if(res.headers.link &&
      res.headers['content-type'] !== 'application/ld+json') {
      // only 1 related link header permitted
      const linkHeaders = parseLinkHeader(res.headers.link);
      const linkedContext = linkHeaders[LINK_HEADER_CONTEXT];
      if(Array.isArray(linkedContext)) {
        throw new JsonLdError(
          'URL could not be dereferenced, it has more than one associated ' +
          'HTTP Link Header.',
          'jsonld.InvalidUrl',
          {code: 'multiple context link headers', url});
      }
      if(linkedContext) {
        doc.contextUrl = linkedContext.target;
      }

      // "alternate" link header is a redirect
      alternate = linkHeaders['alternate'];
      if(alternate &&
        alternate.type == 'application/ld+json' &&
        !(res.headers['content-type'] || '')
          .match(/^application\/(\w*\+)?json$/)) {
        res.headers.location = prependBase(url, alternate.target);
      }
    }

    // handle redirect
    if((alternate ||
      res.statusCode >= 300 && res.statusCode < 400) && res.headers.location) {
      if(redirects.length === maxRedirects) {
        throw new JsonLdError(
          'URL could not be dereferenced; there were too many redirects.',
          'jsonld.TooManyRedirects', {
            code: 'loading document failed',
            url,
            httpStatusCode: res.statusCode,
            redirects
          });
      }
      if(redirects.indexOf(url) !== -1) {
        throw new JsonLdError(
          'URL could not be dereferenced; infinite redirection was detected.',
          'jsonld.InfiniteRedirectDetected', {
            code: 'recursive context inclusion',
            url,
            httpStatusCode: res.statusCode,
            redirects
          });
      }
      redirects.push(url);
      return loadDocument(res.headers.location, redirects);
    }

    // cache for each redirected URL
    redirects.push(url);
    // TODO: disable cache until HTTP caching implemented
    /*
    for(let i = 0; i < redirects.length; ++i) {
      cache.set(
        redirects[i],
        {contextUrl: null, documentUrl: redirects[i], document: body});
    }
    */

    return doc;
  }
};

function _request(request, options) {
  return new Promise((resolve, reject) => {
    request(options, (err, res, body) => {
      if(err) {
        reject(err);
      } else {
        resolve({res, body});
      }
    });
  });
}
