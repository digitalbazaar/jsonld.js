import {Processor} from './Processor';
import {JsonLdError} from './JsonLdError';
import {documentLoader} from './documentLoader';
import {expand} from './expand';
export const createNodeMap = function(input, options, callback) {
      if (arguments.length < 1) {
        return setImmediate(function() {
          callback(new TypeError('Could not create node map, too few arguments.'));
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
      expand(input, options, function(err, _input) {
        if (err) {
          return callback(new JsonLdError(
            'Could not expand input before creating node map.',
            'jsonld.CreateNodeMapError', {
              cause: err
            }));
        }

        var nodeMap;
        try {
          nodeMap = new Processor().createNodeMap(_input, options);
        } catch (ex) {
          return callback(ex);
        }

        callback(null, nodeMap);
      });
    };
