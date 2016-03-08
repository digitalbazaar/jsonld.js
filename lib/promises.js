import {promisify} from './promisify';
import {merge} from './merge';
import {createNodeMap} from './createNodeMap';
import {toRDF} from './toRDF';
import {fromRDF} from './fromRDF';
import {normalize} from './normalize';
import {link} from './link';
import {frame} from './frame';
import {flatten} from './flatten';
import {expand} from './expand';
import {compact} from './compact';
import {RDF} from './literalVarDecs';
export const promises = function(options) {
      options = options || {};
      var slice = Array.prototype.slice;
      var _declobberedpromisify = promisify;

      // handle 'api' option as version, set defaults
      var api = options.api || {};
      var version = options.version || 'jsonld.js';
      if (typeof options.api === 'string') {
        if (!options.version) {
          version = options.api;
        }
        api = {};
      }

      api.expand = function(input) {
        if (arguments.length < 1) {
          throw new TypeError('Could not expand, too few arguments.');
        }
        return _declobberedpromisify.apply(null, [expand].concat(slice.call(arguments)));
      };
      api.compact = function(input, ctx) {
        if (arguments.length < 2) {
          throw new TypeError('Could not compact, too few arguments.');
        }
        var _declobberedcompact = function(input, ctx, options, callback) {
          // ensure only one value is returned in callback
          compact(input, ctx, options, function(err, compacted) {
            callback(err, compacted);
          });
        };
        return _declobberedpromisify.apply(null, [_declobberedcompact].concat(slice.call(arguments)));
      };
      api.flatten = function(input) {
        if (arguments.length < 1) {
          throw new TypeError('Could not flatten, too few arguments.');
        }
        return _declobberedpromisify.apply(
          null, [flatten].concat(slice.call(arguments)));
      };
      api.frame = function(input, _declobberedframe) {
        if (arguments.length < 2) {
          throw new TypeError('Could not frame, too few arguments.');
        }
        return _declobberedpromisify.apply(null, [frame].concat(slice.call(arguments)));
      };
      api.fromRDF = function(dataset) {
        if (arguments.length < 1) {
          throw new TypeError('Could not convert from RDF, too few arguments.');
        }
        return _declobberedpromisify.apply(
          null, [fromRDF].concat(slice.call(arguments)));
      };
      api.toRDF = function(input) {
        if (arguments.length < 1) {
          throw new TypeError('Could not convert to RDF, too few arguments.');
        }
        return _declobberedpromisify.apply(null, [toRDF].concat(slice.call(arguments)));
      };
      api.normalize = function(input) {
        if (arguments.length < 1) {
          throw new TypeError('Could not normalize, too few arguments.');
        }
        return _declobberedpromisify.apply(
          null, [normalize].concat(slice.call(arguments)));
      };

      if (version === 'jsonld.js') {
        api.link = function(input, ctx) {
          if (arguments.length < 2) {
            throw new TypeError('Could not link, too few arguments.');
          }
          return _declobberedpromisify.apply(
            null, [link].concat(slice.call(arguments)));
        };
        api.objectify = function(input) {
          return _declobberedpromisify.apply(
            null, [jsonld.objectify].concat(slice.call(arguments)));
        };
        api.createNodeMap = function(input) {
          return _declobberedpromisify.apply(
            null, [createNodeMap].concat(slice.call(arguments)));
        };
        api.merge = function(input) {
          return _declobberedpromisify.apply(
            null, [merge].concat(slice.call(arguments)));
        };
      }



      return api;
    };

promises({
      api: promises
    });

