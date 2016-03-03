import {_isArray} from './_isArray';
import {JsonLdError} from './JsonLdError';
import {LINK_HEADER_REL} from './LINK_HEADER_REL';
import {jsonldDOTparseLinkHeader} from './jsonldDOTparseLinkHeader';
export const jsonldDOTdocumentLoader = (function() {
  var nodeStatusCodes = require('node-status-codes');
  var request = require('superagent');
  var cache = new require('cache-service-cache-module')();
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
  require('superagent-cache')(request, cache, {prune: prune});

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

    request
      .get(url)
      //.redirects(5)
      //.redirects(maxRedirects)
      .set('Accept', acceptTypes.join(', '))
      .end(handleResponse);

    function handleResponse(err, res, key) {
      if (!res.text) {
       res.body = null;
      }
      var body = res.body;
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
        var linkHeader = jsonldDOTparseLinkHeader(
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
