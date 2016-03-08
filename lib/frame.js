import {_clone} from './_clone';
import {_isArray} from './_isArray';
import {_compactIri} from './_compactIri';
import {_removePreserve} from './_removePreserve';
import {Processor} from './Processor';
import {JsonLdError} from './JsonLdError';
import {documentLoader} from './documentLoader';
import {link} from './link';
import {expand} from './expand';
import {compact} from './compact';
export const frame = function(input, _declobberedframe, options, callback) {
      if (arguments.length < 2) {
        return setImmediate(function() {
          callback(new TypeError('Could not frame, too few arguments.'));
        });
      }

      // get arguments
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      options = options || {};

      // set default options
      if (!('base' in options)) {
        options.base = (typeof input === 'string') ? input : '';
      }
      if (!('documentLoader' in options)) {
        options.documentLoader = documentLoader;
      }
      if (!('embed' in options)) {
        options.embed = '@last';
      }
      options.explicit = options.explicit || false;
      if (!('requireAll' in options)) {
        options.requireAll = true;
      }
      options.omitDefault = options.omitDefault || false;

      setImmediate(function() {
        // if frame is a string, attempt to dereference remote document
        if (typeof _declobberedframe === 'string') {
          var done = function(err, remoteDoc) {
            if (err) {
              return callback(err);
            }
            try {
              if (!remoteDoc.document) {
                throw new JsonLdError(
                  'No remote document found at the given URL.',
                  'jsonld.NullRemoteDocument');
              }
              if (typeof remoteDoc.document === 'string') {
                remoteDoc.document = JSON.parse(remoteDoc.document);
              }
            } catch (ex) {
              return callback(new JsonLdError(
                'Could not retrieve a JSON-LD document from the URL. URL ' +
                'dereferencing not implemented.', 'jsonld.LoadDocumentError', {
                  code: 'loading document failed',
                  cause: ex,
                  remoteDoc: remoteDoc
                }));
            }
            doFrame(remoteDoc);
          };
          var promise = options.documentLoader(_declobberedframe, done);
          if (promise && 'then' in promise) {
            promise.then(done.bind(null, null), done);
          }
          return;
        }
        // nothing to load
        doFrame({
          contextUrl: null,
          documentUrl: null,
          document: _declobberedframe
        });
      });

      function doFrame(remoteFrame) {
        // preserve frame context and add any Link header context
        var _declobberedframe = remoteFrame.document;
        var ctx;
        if (_declobberedframe) {
          ctx = _declobberedframe['@context'];
          if (remoteFrame.contextUrl) {
            if (!ctx) {
              ctx = remoteFrame.contextUrl;
            } else if (_isArray(ctx)) {
              ctx.push(remoteFrame.contextUrl);
            } else {
              ctx = [ctx, remoteFrame.contextUrl];
            }
            _declobberedframe['@context'] = ctx;
          } else {
            ctx = ctx || {};
          }
        } else {
          ctx = {};
        }

        // expand input
        expand(input, options, function(err, expanded) {
          if (err) {
            return callback(new JsonLdError(
              'Could not expand input before framing.',
              'jsonld.FrameError', {
                cause: err
              }));
          }

          // expand frame
          var opts = _clone(options);
          opts.isFrame = true;
          opts.keepFreeFloatingNodes = true;
          expand(_declobberedframe, opts, function(err, expandedFrame) {
            if (err) {
              return callback(new JsonLdError(
                'Could not expand frame before framing.',
                'jsonld.FrameError', {
                  cause: err
                }));
            }

            var framed;
            try {
              // do framing
              framed = new Processor().frame(expanded, expandedFrame, opts);
            } catch (ex) {
              return callback(ex);
            }

            // compact result (force @graph option to true, skip expansion,
            // check for linked embeds)
            opts.graph = true;
            opts.skipExpansion = true;
            opts.link = {};
            compact(framed, ctx, opts, function(err, compacted, ctx) {
              if (err) {
                return callback(new JsonLdError(
                  'Could not compact framed output.',
                  'jsonld.FrameError', {
                    cause: err
                  }));
              }
              // get graph alias
              var graph = _compactIri(ctx, '@graph');
              // remove @preserve from results
              opts.link = {};
              compacted[graph] = _removePreserve(ctx, compacted[graph], opts);
              callback(null, compacted);
            });
          });
        });
      }
    };
