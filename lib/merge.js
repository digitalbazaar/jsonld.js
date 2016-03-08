import {_declobberedIdentifierIssuer} from './_declobberedIdentifierIssuer';
import {_isSubjectReference} from './_isSubjectReference';
import {_isArray} from './_isArray';
import {_mergeNodeMaps} from './_mergeNodeMaps';
import {_createNodeMap} from './_createNodeMap';
import {JsonLdError} from './JsonLdError';
import {relabelBlankNodes} from './relabelBlankNodes';
import {expand} from './expand';
import {compact} from './compact';
export const merge = function(docs, ctx, options, callback) {
      if (arguments.length < 1) {
        return setImmediate(function() {
          callback(new TypeError('Could not merge, too few arguments.'));
        });
      }
      if (!_isArray(docs)) {
        return setImmediate(function() {
          callback(new TypeError('Could not merge, "docs" must be an array.'));
        });
      }

      // get arguments
      if (typeof options === 'function') {
        callback = options;
        options = {};
      } else if (typeof ctx === 'function') {
        callback = ctx;
        ctx = null;
        options = {};
      }
      options = options || {};

      // expand all documents
      var expanded = [];
      var error = null;
      var count = docs.length;
      for (var i = 0; i < docs.length; ++i) {
        var opts = {};
        for (var key in options) {
          opts[key] = options[key];
        }
        expand(docs[i], opts, expandComplete);
      }

      function expandComplete(err, _input) {
        if (error) {
          return;
        }
        if (err) {
          error = err;
          return callback(new JsonLdError(
            'Could not expand input before flattening.',
            'jsonld.FlattenError', {
              cause: err
            }));
        }
        expanded.push(_input);
        if (--count === 0) {
          _declobberedmerge(expanded);
        }
      }

      function _declobberedmerge(expanded) {
        var mergeNodes = true;
        if ('mergeNodes' in options) {
          mergeNodes = options.mergeNodes;
        }

        var issuer = options.namer || options.issuer || new _declobberedIdentifierIssuer('_:b');
        var graphs = {
          '@default': {}
        };

        var defaultGraph;
        try {
          for (var i = 0; i < expanded.length; ++i) {
            // uniquely relabel blank nodes
            var doc = expanded[i];
            doc = relabelBlankNodes(doc, {
              issuer: new _declobberedIdentifierIssuer('_:b' + i + '-')
            });

            // add nodes to the shared node map graphs if merging nodes, to a
            // separate graph set if not
            var _graphs = (mergeNodes || i === 0) ? graphs : {
              '@default': {}
            };
            _createNodeMap(doc, _graphs, '@default', issuer);

            if (_graphs !== graphs) {
              // merge document graphs but don't merge existing nodes
              for (var graphName in _graphs) {
                var _nodeMap = _graphs[graphName];
                if (!(graphName in graphs)) {
                  graphs[graphName] = _nodeMap;
                  continue;
                }
                var nodeMap = graphs[graphName];
                for (var key in _nodeMap) {
                  if (!(key in nodeMap)) {
                    nodeMap[key] = _nodeMap[key];
                  }
                }
              }
            }
          }

          // add all non-default graphs to default graph
          defaultGraph = _mergeNodeMaps(graphs);
        } catch (ex) {
          return callback(ex);
        }

        // produce flattened output
        var flattened = [];
        var keys = Object.keys(defaultGraph).sort();
        for (var ki = 0; ki < keys.length; ++ki) {
          var node = defaultGraph[keys[ki]];
          // only add full subjects to top-level
          if (!_isSubjectReference(node)) {
            flattened.push(node);
          }
        }

        if (ctx === null) {
          return callback(null, flattened);
        }

        // compact result (force @graph option to true, skip expansion)
        options.graph = true;
        options.skipExpansion = true;
        compact(flattened, ctx, options, function(err, compacted) {
          if (err) {
            return callback(new JsonLdError(
              'Could not compact merged output.',
              'jsonld.MergeError', {
                cause: err
              }));
          }
          callback(null, compacted);
        });
      }
    };
