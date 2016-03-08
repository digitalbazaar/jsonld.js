import {_findContextUrls} from './_findContextUrls';
import {_clone} from './_clone';
import {_isString} from './_isString';
import {_isArray} from './_isArray';
import {_isObject} from './_isObject';
import {JsonLdError} from './JsonLdError';
import {url} from './url';
import {documentLoader} from './documentLoader';
import {MAX_CONTEXT_URLS} from './literalVarDecs';
export function _retrieveContextUrls(input, options, callback) {
      // if any error occurs during URL resolution, quit
      var error = null;

      // recursive document loader
      var _declobbereddocumentLoader = options.documentLoader;
      var retrieve = function(input, cycles, _declobbereddocumentLoader, base, callback) {
        if (Object.keys(cycles).length > MAX_CONTEXT_URLS) {
          error = new JsonLdError(
            'Maximum number of @context URLs exceeded.',
            'jsonld.ContextUrlError',
            {
              code: 'loading remote context failed',
              max: MAX_CONTEXT_URLS
            });
          return callback(error);
        }

        // for tracking the URLs to retrieve
        var urls = {};

        // finished will be called once the URL queue is empty
        var finished = function() {
          // replace all URLs in the input
          _findContextUrls(input, urls, true, base);
          callback(null, input);
        };

        // find all URLs in the given input
        if (!_findContextUrls(input, urls, false, base)) {
          // no new URLs in input
          finished();
        }

        // queue all unretrieved URLs
        var queue = [];
        for (var _declobberedurl in urls) {
          if (urls[_declobberedurl] === false) {
            queue.push(_declobberedurl);
          }
        }

        // retrieve URLs in queue
        var count = queue.length;
        for (var i = 0; i < queue.length; ++i) {
          (function(_declobberedurl) {
            // check for context URL cycle
            if (_declobberedurl in cycles) {
              error = new JsonLdError(
                'Cyclical @context URLs detected.',
                'jsonld.ContextUrlError',
                {
                  code: 'recursive context inclusion',
                  url: _declobberedurl
                });
              return callback(error);
            }
            var _cycles = _clone(cycles);
            _cycles[_declobberedurl] = true;
            var done = function(err, remoteDoc) {
              // short-circuit if there was an error with another URL
              if (error) {
                return;
              }

              var ctx = remoteDoc ? remoteDoc.document : null;

              // parse string context as JSON
              if (!err && _isString(ctx)) {
                try {
                  ctx = JSON.parse(ctx);
                } catch (ex) {
                  err = ex;
                }
              }

              // ensure ctx is an object
              if (err) {
                err = new JsonLdError(
                  'Dereferencing a URL did not result in a valid JSON-LD object. ' +
                  'Possible causes are an inaccessible URL perhaps due to ' +
                  'a same-origin policy (ensure the server uses CORS if you are ' +
                  'using client-side JavaScript), too many redirects, a ' +
                  'non-JSON response, or more than one HTTP Link Header was ' +
                  'provided for a remote context.',
                  'jsonld.InvalidUrl',
                  {
                    code: 'loading remote context failed',
                    url: _declobberedurl,
                    cause: err
                  });
              } else if (!_isObject(ctx)) {
                err = new JsonLdError(
                  'Dereferencing a URL did not result in a JSON object. The ' +
                  'response was valid JSON, but it was not a JSON object.',
                  'jsonld.InvalidUrl',
                  {
                    code: 'invalid remote context',
                    url: _declobberedurl,
                    cause: err
                  });
              }
              if (err) {
                error = err;
                return callback(error);
              }

              // use empty context if no @context key is present
              if (!('@context' in ctx)) {
                ctx = {
                  '@context': {}
                };
              } else {
                ctx = {
                  '@context': ctx['@context']
                };
              }

              // append context URL to context if given
              if (remoteDoc.contextUrl) {
                if (!_isArray(ctx['@context'])) {
                  ctx['@context'] = [ctx['@context']];
                }
                ctx['@context'].push(remoteDoc.contextUrl);
              }

              // recurse
              retrieve(ctx, _cycles, _declobbereddocumentLoader, _declobberedurl, function(err, ctx) {
                if (err) {
                  return callback(err);
                }
                urls[_declobberedurl] = ctx['@context'];
                count -= 1;
                if (count === 0) {
                  finished();
                }
              });
            };
            var promise = _declobbereddocumentLoader(_declobberedurl, done);
            if (promise && 'then' in promise) {
              promise.then(done.bind(null, null), done);
            }
          }(queue[i]));
        }
      };
      retrieve(input, {}, _declobbereddocumentLoader, options.base, callback);
    }
