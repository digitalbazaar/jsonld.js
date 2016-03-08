import {_toNQuads} from './_toNQuads';
import {Processor} from './Processor';
import {JsonLdError} from './JsonLdError';
import {documentLoader} from './documentLoader';
import {expand} from './expand';
import {RDF} from './literalVarDecs';
export const toRDF = function(input, options, callback) {
      if (arguments.length < 1) {
        return setImmediate(function() {
          callback(new TypeError('Could not convert to RDF, too few arguments.'));
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

      // expand input
      expand(input, options, function(err, expanded) {
        if (err) {
          return callback(new JsonLdError(
            'Could not expand input before serialization to RDF.',
            'jsonld.RdfError', {
              cause: err
            }));
        }

        var dataset;
        try {
          // output RDF dataset
          dataset = Processor.prototype.toRDF(expanded, options);
          if (options.format) {
            if (options.format === 'application/nquads') {
              return callback(null, _toNQuads(dataset));
            }
            throw new JsonLdError(
              'Unknown output format.',
              'jsonld.UnknownFormat', {
                format: options.format
              });
          }
        } catch (ex) {
          return callback(ex);
        }
        callback(null, dataset);
      });
    };
