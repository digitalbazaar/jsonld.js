import {parseLinkHeader} from './parseLinkHeader.js';
import {JsonLdError} from './JsonLdError.js';
import {LINK_HEADER_REL} from './literalVarDecs';
import {_isArray} from './_isArray.js';
import nodeStatusCodes from 'node-status-codes';

import request from 'superagent';
import superagentCache from 'superagent-cache';
import Cache from 'cache-service-cache-module';

export const documentLoader = (function() {
  // currently just letting browser HTTP caching take care of itself, and
  // superagentCache is currently explicitly not being included in
  // the browser build.
  // this is just for Node, which doesn't have HTTP caching built in.
  if (typeof superagentCache === 'function' && typeof Cache === 'function') {
    var cache = new Cache();
    var prune = function(res) {
      return {
        body: res.body,
        text: res.text,
        headers: res.headers,
        statusCode: res.statusCode,
        status: res.status,
        ok: res.ok,
        redirects: res.redirects
      };
    };
    superagentCache(request, cache, {prune: prune});
  }

  // By default, no options are passed in. But by calling jsonld.useDocumentLoader,
  // jsonld.js allows for overriding the default document loader, including setting options.
  // https://github.com/digitalbazaar/jsonld.js/blob/master/js/jsonld.js#L1982
  // This version does not allow for overring the default document loader.
  var options = {};
  var strictSSL = ('strictSSL' in options) ? options.strictSSL : true;
  var maxRedirects = ('maxRedirects' in options) ? options.maxRedirects : 0;

  function loadDocument(url, callback) {
    if(url.indexOf('http:') !== 0 && url.indexOf('https:') !== 0) {
      return callback(new JsonLdError(
        'URL could not be dereferenced; only "http" and "https" URLs are ' +
        'supported.',
        'jsonld.InvalidUrl', {code: 'loading document failed', url: url}),
        {contextUrl: null, documentUrl: url, document: null});
    }
    if(options.secure && url.indexOf('https') !== 0) {
      return callback(new JsonLdError(
        'URL could not be dereferenced; secure mode is enabled and ' +
        'the URL\'s scheme is not "https".',
        'jsonld.InvalidUrl', {code: 'loading document failed', url: url}),
        {contextUrl: null, documentUrl: url, document: null});
    }

    var acceptTypes = [
      'application/ld+json',
      'application/json'
    ];

    // browser handles redirects. Request.prototype.redirects is just for Node.
    // https://github.com/visionmedia/superagent/issues/380
    if (request.Request.prototype.redirects) {
      request
        .get(url)
        // TODO if I use the default maxRedirects of "none", the tests fail.
        // I don't see where the tests specify to use more than zero for maxRedirects.
        // So I'm setting this to 3 for now, but that means it doesn't follow jsonld.js.
        .redirects(3)
        //.redirects(maxRedirects)
        .set('Accept', acceptTypes.join(', '))
        .end(handleResponse);
    } else {
      request
        .get(url)
        .set('Accept', acceptTypes.join(', '))
        .end(handleResponse);
    }

    function handleResponse(err, res, key) {
      var text = res.text;
      var body = res.body;
      if (!text) {
        body = null;
      } else if (text && !body && ['[', '{'].indexOf(text[0]) > -1) {
        // TODO is there a better way to make it parse JSON-LD as JSON?
        body = JSON.parse(text);
      }

      var documentUrl = url;
      var redirects = res.redirects;
      if (redirects) {
        var redirectsLength = redirects.length;
        if (redirectsLength && redirectsLength > 0) {
          documentUrl = redirects[redirectsLength - 1];
        }
      }
      var doc = {contextUrl: null, documentUrl: documentUrl, document: body || null};

      // handle error
      if(err) {
        return callback(new JsonLdError(
          'URL could not be dereferenced, an error occurred.',
          'jsonld.LoadDocumentError',
          {code: 'loading document failed', url: url, cause: err}), doc);
      }
      var statusText = nodeStatusCodes[res.statusCode];
      if(res.statusCode >= 400) {
        return callback(new JsonLdError(
          'URL could not be dereferenced: ' + statusText,
          'jsonld.InvalidUrl', {
            code: 'loading document failed',
            url: url,
            httpStatusCode: res.statusCode
          }), doc);
      }

      // handle Link Header
      var responseContentType = res.headers['content-type'];
      if(res.headers.link && responseContentType !== 'application/ld+json') {
        // only 1 related link header permitted
        var linkHeader = parseLinkHeader(
          res.headers.link)[LINK_HEADER_REL];
        if(_isArray(linkHeader)) {
          return callback(new JsonLdError(
            'URL could not be dereferenced, it has more than one associated ' +
            'HTTP Link Header.',
            'jsonld.InvalidUrl',
            {code: 'multiple context link headers', url: url}), doc);
        }
        if(linkHeader) {
          doc.contextUrl = linkHeader.target;
        }
      }

      return callback(err, doc);
    }
  }

  return loadDocument;
}());
