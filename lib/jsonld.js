/**
 * A JavaScript implementation of the JSON-LD API.
 *
 * @author Dave Longley
 *
 * @license BSD 3-Clause License
 * Copyright (c) 2011-2017 Digital Bazaar, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 *
 * Neither the name of the Digital Bazaar, Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
(function() {

const canonize = require('rdf-canonize');
const util = require('./util');
const IdentifierIssuer = util.IdentifierIssuer;
const NQuads = require('./NQuads');
const Rdfa = require('./Rdfa');

const {
  clone: _clone,
  relabelBlankNodes: _relabelBlankNodes
} = util;

const {
  isArray: _isArray,
  isObject: _isObject,
  isString: _isString
} = require('./types');

const {
  isList: _isList,
  isSubjectReference: _isSubjectReference,
  isValue: _isValue
} = require('./graphTypes');

const {
  getInitialContext: _getInitialContext,
  process: _processContext,
  getAllContexts: _getAllContexts
} = require('./context');

const {
  expand: _expand
} = require('./expand');

const {
  compact: _compact,
  compactIri: _compactIri
} = require('./compact');

const {
  flatten: _flatten
} = require('./flatten');

const {
  frameMerged: _frameMerged
} = require('./frame');

const {
  createNodeMap: _createNodeMap,
  createMergedNodeMap: _createMergedNodeMap,
  mergeNodeMaps: _mergeNodeMaps
} = require('./nodeMap');

const {
  fromRDF: _fromRDF
} = require('./fromRdf');

const {
  toRDF: _toRDF
} = require('./toRdf');

// determine if in-browser or using node.js
var _nodejs = (
  typeof process !== 'undefined' && process.versions && process.versions.node);
var _browser = !_nodejs &&
  (typeof window !== 'undefined' || typeof self !== 'undefined');

// attaches jsonld API to the given object
var wrapper = function(jsonld) {

/* Core API */

/**
 * Performs JSON-LD compaction.
 *
 * @param input the JSON-LD input to compact.
 * @param ctx the context to compact with.
 * @param [options] options to use:
 *          [base] the base IRI to use.
 *          [compactArrays] true to compact arrays to single values when
 *            appropriate, false not to (default: true).
 *          [graph] true to always output a top-level graph (default: false).
 *          [expandContext] a context to expand with.
 *          [skipExpansion] true to assume the input is expanded and skip
 *            expansion, false not to, defaults to false.
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 *          [expansionMap(info)] a function that can be used to custom map
 *            unmappable values (or to throw an error when they are detected);
 *            if this function returns `undefined` then the default behavior
 *            will be used.
 *          [framing] true if compaction is occuring during a framing operation.
 *          [compactionMap(info)] a function that can be used to custom map
 *            unmappable values (or to throw an error when they are detected);
 *            if this function returns `undefined` then the default behavior
 *            will be used.
 * @param [callback(err, compacted)] called once the operation completes.
 *
 * @return a Promise that resolves to the compacted output.
 */
jsonld.compact = util.callbackify(async function(input, ctx, options) {
  if(arguments.length < 2) {
    throw new TypeError('Could not compact, too few arguments.');
  }

  if(ctx === null) {
    throw new JsonLdError(
      'The compaction context must not be null.',
      'jsonld.CompactError', {code: 'invalid local context'});
  }

  // nothing to compact
  if(input === null) {
    return null;
  }

  // set default options
  if(typeof options === 'function') {
    options = {};
  } else {
    options = options || {};
  }
  if(!('base' in options)) {
    options.base = _isString(input) ? input : '';
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }
  if(!('compactArrays' in options)) {
    options.compactArrays = true;
  }
  if(!('graph' in options)) {
    options.graph = false;
  }
  if(!('skipExpansion' in options)) {
    options.skipExpansion = false;
  }
  if(!('link' in options)) {
    options.link = false;
  }
  if(options.link) {
    // force skip expansion when linking, "link" is not part of the public
    // API, it should only be called from framing
    options.skipExpansion = true;
  }

  // expand input
  let expanded;
  try {
    if(options.skipExpansion) {
      expanded = input;
    } else {
      expanded = await jsonld.expand(input, options);
    }
  } catch(e) {
    throw new JsonLdError(
      'Could not expand input before compaction.',
      'jsonld.CompactError', {cause: e});
  }

  // process context
  let activeCtx;
  try {
    activeCtx = await jsonld.processContext(
      _getInitialContext(options), ctx, options);
  } catch(e) {
    throw new JsonLdError(
      'Could not process context before compaction.',
      'jsonld.CompactError', {cause: e});
  }

  // do compaction
  let compacted = _compact({
    activeCtx,
    element: expanded,
    options,
    compactionMap: options.compactionMap
  });

  // perform clean up
  if(options.compactArrays && !options.graph && _isArray(compacted)) {
    if(compacted.length === 1) {
      // simplify to a single item
      compacted = compacted[0];
    } else if(compacted.length === 0) {
      // simplify to an empty object
      compacted = {};
    }
  } else if(options.graph && _isObject(compacted)) {
    // always use array if graph option is on
    compacted = [compacted];
  }

  // follow @context key
  if(_isObject(ctx) && '@context' in ctx) {
    ctx = ctx['@context'];
  }

  // build output context
  ctx = _clone(ctx);
  if(!_isArray(ctx)) {
    ctx = [ctx];
  }
  // remove empty contexts
  const tmp = ctx;
  ctx = [];
  for(let i = 0; i < tmp.length; ++i) {
    if(!_isObject(tmp[i]) || Object.keys(tmp[i]).length > 0) {
      ctx.push(tmp[i]);
    }
  }

  // remove array if only one context
  const hasContext = (ctx.length > 0);
  if(ctx.length === 1) {
    ctx = ctx[0];
  }

  // add context and/or @graph
  if(_isArray(compacted)) {
    // use '@graph' keyword
    const graphAlias = _compactIri({activeCtx, iri: '@graph'});
    const graph = compacted;
    compacted = {};
    if(hasContext) {
      compacted['@context'] = ctx;
    }
    compacted[graphAlias] = graph;
  } else if(_isObject(compacted) && hasContext) {
    // reorder keys so @context is first
    const graph = compacted;
    compacted = {'@context': ctx};
    for(let key in graph) {
      compacted[key] = graph[key];
    }
  }

  if(options.framing) {
    // get graph alias
    const graph = _compactIri({activeCtx, iri: '@graph'});
    // remove @preserve from results
    options.link = {};
    compacted[graph] = _removePreserve(activeCtx, compacted[graph], options);
  }

  return compacted;
});

/**
 * Performs JSON-LD expansion.
 *
 * @param input the JSON-LD input to expand.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [keepFreeFloatingNodes] true to keep free-floating nodes,
 *            false not to, defaults to false.
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 *          [expansionMap(info)] a function that can be used to custom map
 *            unmappable values (or to throw an error when they are detected);
 *            if this function returns `undefined` then the default behavior
 *            will be used.
 * @param [callback(err, expanded)] called once the operation completes.
 *
 * @return a Promise that resolves to the expanded output.
 */
jsonld.expand = util.callbackify(async function(input, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not expand, too few arguments.');
  }

  // set default options
  if(typeof options === 'function') {
    options = {};
  } else {
    options = options || {};
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }
  if(!('keepFreeFloatingNodes' in options)) {
    options.keepFreeFloatingNodes = false;
  }

  // build set of objects that may have @contexts to resolve
  const toResolve = {};

  // build set of contexts to process prior to expansion
  const contextsToProcess = [];

  // if an `expandContext` has been given ensure it gets resolved
  if('expandContext' in options) {
    const expandContext = _clone(options.expandContext);
    if(_isObject(expandContext) && '@context' in expandContext) {
      toResolve.expandContext = expandContext;
    } else {
      toResolve.expandContext = {'@context': expandContext};
    }
    contextsToProcess.push(toResolve.expandContext);
  }

  // if input is a string, attempt to dereference remote document
  let remoteDoc;
  let defaultBase;
  if(!_isString(input)) {
    // input is not a URL, do not need to retrieve it first
    toResolve.input = _clone(input);
  } else {
    // load remote doc
    const load = util.normalizeDocumentLoader(options.documentLoader);
    remoteDoc = await load(input);

    try {
      if(!remoteDoc.document) {
        throw new JsonLdError(
          'No remote document found at the given URL.',
          'jsonld.NullRemoteDocument');
      }
      if(_isString(remoteDoc.document)) {
        remoteDoc.document = JSON.parse(remoteDoc.document);
      }
    } catch(e) {
      throw new JsonLdError(
        'Could not retrieve a JSON-LD document from the URL.',
        'jsonld.LoadDocumentError', {
          code: 'loading document failed',
          cause: e,
          remoteDoc: remoteDoc
        });
    }

    defaultBase = remoteDoc.documentUrl;
    toResolve.input = remoteDoc.document;
    if(remoteDoc.contextUrl) {
      // context included in HTTP link header and must be resolved
      toResolve.remoteContext = {'@context': remoteDoc.contextUrl};
      contextsToProcess.push(toResolve.remoteContext);
    }
  }

  // set default base
  if(!('base' in options)) {
    options.base = defaultBase || '';
  }

  // get all contexts in `toResolve`
  await _getAllContexts(toResolve, options);

  // process any additional contexts
  let activeCtx = _getInitialContext(options);
  contextsToProcess.forEach(localCtx => {
    activeCtx = _processContext({activeCtx, localCtx, options});
  });

  // expand resolved input
  let expanded = _expand({
    activeCtx,
    element: toResolve.input,
    options,
    expansionMap: options.expansionMap
  });

  // optimize away @graph with no other properties
  if(_isObject(expanded) && ('@graph' in expanded) &&
    Object.keys(expanded).length === 1) {
    expanded = expanded['@graph'];
  } else if(expanded === null) {
    expanded = [];
  }

  // normalize to an array
  if(!_isArray(expanded)) {
    expanded = [expanded];
  }

  return expanded;
});

/**
 * Performs JSON-LD flattening.
 *
 * @param input the JSON-LD to flatten.
 * @param ctx the context to use to compact the flattened output, or null.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param [callback(err, flattened)] called once the operation completes.
 *
 * @return a Promise that resolves to the flattened output.
 */
jsonld.flatten = util.callbackify(async function(input, ctx, options) {
  if(arguments.length < 1) {
    return new TypeError('Could not flatten, too few arguments.');
  }

  if(typeof ctx === 'function') {
    ctx = null;
  }

  // set default options
  if(typeof options === 'function') {
    options = {};
  } else {
    options = options || {};
  }
  if(!('base' in options)) {
    options.base = _isString(input) ? input : '';
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }

  // expand input
  let expanded;
  try {
    expanded = await jsonld.expand(input, options);
  } catch(e) {
    throw new JsonLdError(
      'Could not expand input before flattening.',
      'jsonld.FlattenError', {cause: e});
  }

  // do flattening
  const flattened = _flatten(expanded);

  if(ctx === null) {
    // no compaction required
    return flattened;
  }

  let compacted;
  try {
    // compact result (force @graph option to true, skip expansion)
    options.graph = true;
    options.skipExpansion = true;
    compacted = await jsonld.compact(flattened, ctx, options);
  } catch(e) {
    throw new JsonLdError(
      'Could not compact flattened output.',
      'jsonld.FlattenError', {cause: e});
  }

  return compacted;
});

/**
 * Performs JSON-LD framing.
 *
 * @param input the JSON-LD input to frame.
 * @param frame the JSON-LD frame to use.
 * @param [options] the framing options.
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [embed] default @embed flag: '@last', '@always', '@never', '@link'
 *            (default: '@last').
 *          [explicit] default @explicit flag (default: false).
 *          [requireAll] default @requireAll flag (default: true).
 *          [omitDefault] default @omitDefault flag (default: false).
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param callback(err, framed) called once the operation completes.
 *
 * @return a Promise that resolves to the framed output.
 */
jsonld.frame = util.callbackify(async function(input, frame, options) {
  if(arguments.length < 2) {
    throw new TypeError('Could not frame, too few arguments.');
  }

  // set default options
  if(typeof options === 'function') {
    options = {};
  } else {
    options = options || {};
  }
  if(!('base' in options)) {
    options.base = _isString(input) ? input : '';
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }
  if(!('embed' in options)) {
    options.embed = '@last';
  }
  options.explicit = options.explicit || false;
  if(!('requireAll' in options)) {
    options.requireAll = true;
  }
  options.omitDefault = options.omitDefault || false;

  // if frame is a string, attempt to dereference remote document
  if(_isString(frame)) {
    // load remote doc
    const remoteDoc = await jsonld.get(frame, options);
    frame = remoteDoc.document;

    if(remoteDoc.contextUrl) {
      // inject link header @context into frame
      let ctx = frame['@context'];
      if(!ctx) {
        ctx = remoteDoc.contextUrl;
      } else if(_isArray(ctx)) {
        ctx.push(remoteDoc.contextUrl);
      } else {
        ctx = [ctx, remoteDoc.contextUrl];
      }
      frame['@context'] = ctx;
    }
  }

  let frameContext = frame ? frame['@context'] || {} : {};

  // expand input
  let expanded;
  try {
    expanded = await jsonld.expand(input, options);
  } catch(e) {
    throw new JsonLdError(
      'Could not expand input before framing.',
      'jsonld.FrameError', {cause: e});
  }

  // expand frame
  let expandedFrame;
  const opts = _clone(options);
  try {
    opts.isFrame = true;
    opts.keepFreeFloatingNodes = true;
    expandedFrame = await jsonld.expand(frame, opts);
  } catch(e) {
    throw new JsonLdError(
      'Could not expand frame before framing.',
      'jsonld.FrameError', {cause: e});
  }

  // do merged framing
  const framed = _frameMerged(expanded, expandedFrame, opts);

  // compact result (force @graph option to true, skip expansion,
  // check for linked embeds)
  let compacted;
  try {
    opts.graph = true;
    opts.skipExpansion = true;
    opts.link = {};
    opts.framing = true;
    compacted = await jsonld.compact(framed, frameContext, opts);
  } catch(e) {
    throw new JsonLdError(
      'Could not compact framed output.',
      'jsonld.FrameError', {cause: e});
  }

  return compacted;
});

/**
 * **Experimental**
 *
 * Links a JSON-LD document's nodes in memory.
 *
 * @param input the JSON-LD document to link.
 * @param ctx the JSON-LD context to apply.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param callback(err, linked) called once the operation completes.
 */
jsonld.link = function(input, ctx, options, callback) {
  // API matches running frame with a wildcard frame and embed: '@link'
  // get arguments
  var frame = {};
  if(ctx) {
    frame['@context'] = ctx;
  }
  frame['@embed'] = '@link';
  jsonld.frame(input, frame, options, callback);
};

/**
 * Performs RDF dataset normalization on the given input. The input is JSON-LD
 * unless the 'inputFormat' option is used. The output is an RDF dataset
 * unless the 'format' option is used.
 *
 * @param input the input to normalize as JSON-LD or as a format specified by
 *          the 'inputFormat' option.
 * @param [options] the options to use:
 *          [algorithm] the normalization algorithm to use, `URDNA2015` or
 *            `URGNA2012` (default: `URGNA2012`).
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [inputFormat] the format if input is not JSON-LD:
 *            'application/nquads' for N-Quads.
 *          [format] the format if output is a string:
 *            'application/nquads' for N-Quads.
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param callback(err, normalized) called once the operation completes.
 */
jsonld.normalize = jsonld.canonize = function(input, options, callback) {
  if(arguments.length < 1) {
    return callback(new TypeError('Could not normalize, too few arguments.'));
  }

  // get arguments
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  // set default options
  if(!('algorithm' in options)) {
    options.algorithm = 'URDNA2015';
  }
  if(!('base' in options)) {
    options.base = (typeof input === 'string') ? input : '';
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }

  if('inputFormat' in options) {
    if(options.inputFormat !== 'application/nquads') {
      return callback(new JsonLdError(
        'Unknown normalization input format.',
        'jsonld.NormalizeError'));
    }
    var parsedInput = NQuads.parse(input);
    // do canonicalization
    canonize.canonize(parsedInput, options, callback);
  } else {
    // convert to RDF dataset then do normalization
    var opts = _clone(options);
    delete opts.format;
    opts.produceGeneralizedRdf = false;
    jsonld.toRDF(input, opts, function(err, dataset) {
      if(err) {
        return callback(new JsonLdError(
          'Could not convert input to RDF dataset before normalization.',
          'jsonld.NormalizeError', {cause: err}));
      }
      // do canonicalization
      canonize.canonize(dataset, options, callback);
    });
  }
};

/**
 * Converts an RDF dataset to JSON-LD.
 *
 * @param dataset a serialized string of RDF in a format specified by the
 *          format option or an RDF dataset to convert.
 * @param [options] the options to use:
 *          [format] the format if dataset param must first be parsed:
 *            'application/nquads' for N-Quads (default).
 *          [rdfParser] a custom RDF-parser to use to parse the dataset.
 *          [useRdfType] true to use rdf:type, false to use @type
 *            (default: false).
 *          [useNativeTypes] true to convert XSD types into native types
 *            (boolean, integer, double), false not to (default: false).
 * @param [callback(err, output)] called once the operation completes.
 *
 * @return a Promise that resolves to the JSON-LD document.
 */
jsonld.fromRDF = util.callbackify(async function(dataset, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not convert from RDF, too few arguments.');
  }

  // set default options
  if(typeof options === 'function') {
    options = {};
  } else {
    options = options || {};
  }
  let {format, rdfParser} = options;
  if(format === undefined && _isString(dataset)) {
    // set default format to nquads
    format = 'application/nquads';
  }

  // handle special format
  if(format) {
    // check supported formats
    rdfParser = rdfParser || _rdfParsers[format];
    if(!rdfParser) {
      throw new JsonLdError(
        'Unknown input format.',
        'jsonld.UnknownFormat', {format});
    }
  } else {
    // no-op parser, assume dataset already parsed
    rdfParser = () => dataset;
  }

  // rdfParser can be callback, promise-based, or synchronous
  let parsedDataset;
  if(rdfParser.length > 1) {
    // convert callback-based rdf parser to promise-based
    parsedDataset = new Promise((resolve, reject) => {
      rdfParser(dataset, (err, dataset) => {
        if(err) {
          reject(err);
        } else {
          resolve(dataset);
        }
      });
    });
  } else {
    parsedDataset = Promise.resolve(rdfParser(dataset));
  }

  return _fromRDF(await parsedDataset, options);
});

/**
 * Outputs the RDF dataset found in the given JSON-LD object.
 *
 * @param input the JSON-LD input.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [format] the format to use to output a string:
 *            'application/nquads' for N-Quads.
 *          [produceGeneralizedRdf] true to output generalized RDF, false
 *            to produce only standard RDF (default: false).
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param [callback(err, dataset)] called once the operation completes.
 *
 * @return a Promise that resolves to the RDF dataset.
 */
jsonld.toRDF = util.callbackify(async function(input, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not convert to RDF, too few arguments.');
  }

  // set default options
  if(typeof options === 'function') {
    options = {};
  } else {
    options = options || {};
  }
  if(!('base' in options)) {
    options.base = _isString(input) ? input : '';
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }

  // TODO: support toRDF custom map?

  // expand input
  let expanded;
  try {
    expanded = await jsonld.expand(input, options);
  } catch(e) {
    throw new JsonLdError(
      'Could not expand input before serialization to RDF.',
      'jsonld.RdfError', {cause: e});
  }

  // output RDF dataset
  const dataset = _toRDF(expanded, options);
  if(options.format) {
    if(options.format === 'application/nquads') {
      return await NQuads.serialize(dataset);
    }
    throw new JsonLdError(
      'Unknown output format.',
      'jsonld.UnknownFormat', {format: options.format});
  }

  return dataset;
});

/**
 * **Experimental**
 *
 * Recursively flattens the nodes in the given JSON-LD input into a merged
 * map of node ID => node. All graphs will be merged into the default graph.
 *
 * @param input the JSON-LD input.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [issuer] a jsonld.IdentifierIssuer to use to label blank nodes.
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param [callback(err, nodeMap)] called once the operation completes.
 *
 * @return a Promise that resolves to the merged node map.
 */
jsonld.createNodeMap = util.callbackify(async function(input, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not create node map, too few arguments.');
  }

  // set default options
  if(typeof options === 'function') {
    options = {};
  } else {
    options = options || {};
  }
  if(!('base' in options)) {
    options.base = _isString(input) ? input : '';
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }

  // expand input
  let expanded;
  try {
    expanded = jsonld.expand(input, options);
  } catch(e) {
    throw new JsonLdError(
      'Could not expand input before creating node map.',
      'jsonld.CreateNodeMapError', {cause: e});
  }

  return _createMergedNodeMap(expanded, options);
});

/**
 * **Experimental**
 *
 * Merges two or more JSON-LD documents into a single flattened document.
 *
 * @param docs the JSON-LD documents to merge together.
 * @param ctx the context to use to compact the merged result, or null.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [issuer] a jsonld.IdentifierIssuer to use to label blank nodes.
 *          [mergeNodes] true to merge properties for nodes with the same ID,
 *            false to ignore new properties for nodes with the same ID once
 *            the ID has been defined; note that this may not prevent merging
 *            new properties where a node is in the `object` position
 *            (default: true).
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param callback(err, merged) called once the operation completes.
 */
jsonld.merge = function(docs, ctx, options, callback) {
  if(arguments.length < 1) {
    return callback(new TypeError('Could not merge, too few arguments.'));
  }
  if(!_isArray(docs)) {
    return callback(new TypeError('Could not merge, "docs" must be an array.'));
  }

  // get arguments
  if(typeof options === 'function') {
    callback = options;
    options = {};
  } else if(typeof ctx === 'function') {
    callback = ctx;
    ctx = null;
    options = {};
  }
  options = options || {};

  // expand all documents
  var expanded = [];
  var error = null;
  var count = docs.length;
  for(var i = 0; i < docs.length; ++i) {
    var opts = {};
    for(var key in options) {
      opts[key] = options[key];
    }
    jsonld.expand(docs[i], opts, expandComplete);
  }

  function expandComplete(err, _input) {
    if(error) {
      return;
    }
    if(err) {
      error = err;
      return callback(new JsonLdError(
        'Could not expand input before flattening.',
        'jsonld.FlattenError', {cause: err}));
    }
    expanded.push(_input);
    if(--count === 0) {
      merge(expanded);
    }
  }

  function merge(expanded) {
    var mergeNodes = true;
    if('mergeNodes' in options) {
      mergeNodes = options.mergeNodes;
    }

    var issuer = options.issuer || new IdentifierIssuer('_:b');
    var graphs = {'@default': {}};

    var defaultGraph;
    try {
      for(var i = 0; i < expanded.length; ++i) {
        // uniquely relabel blank nodes
        var doc = expanded[i];
        doc = jsonld.relabelBlankNodes(doc, {
          issuer: new IdentifierIssuer('_:b' + i + '-')
        });

        // add nodes to the shared node map graphs if merging nodes, to a
        // separate graph set if not
        var _graphs = (mergeNodes || i === 0) ? graphs : {'@default': {}};
        _createNodeMap(doc, _graphs, '@default', issuer);

        if(_graphs !== graphs) {
          // merge document graphs but don't merge existing nodes
          for(var graphName in _graphs) {
            var _nodeMap = _graphs[graphName];
            if(!(graphName in graphs)) {
              graphs[graphName] = _nodeMap;
              continue;
            }
            var nodeMap = graphs[graphName];
            for(var key in _nodeMap) {
              if(!(key in nodeMap)) {
                nodeMap[key] = _nodeMap[key];
              }
            }
          }
        }
      }

      // add all non-default graphs to default graph
      defaultGraph = _mergeNodeMaps(graphs);
    } catch(ex) {
      return callback(ex);
    }

    // produce flattened output
    var flattened = [];
    var keys = Object.keys(defaultGraph).sort();
    for(var ki = 0; ki < keys.length; ++ki) {
      var node = defaultGraph[keys[ki]];
      // only add full subjects to top-level
      if(!_isSubjectReference(node)) {
        flattened.push(node);
      }
    }

    if(ctx === null) {
      return callback(null, flattened);
    }

    // compact result (force @graph option to true, skip expansion)
    options.graph = true;
    options.skipExpansion = true;
    jsonld.compact(flattened, ctx, options, function(err, compacted) {
      if(err) {
        return callback(new JsonLdError(
          'Could not compact merged output.',
          'jsonld.MergeError', {cause: err}));
      }
      callback(null, compacted);
    });
  }
};

jsonld.relabelBlankNodes = _relabelBlankNodes;

/**
 * The default document loader for external documents. If the environment
 * is node.js, a callback-continuation-style document loader is used; otherwise,
 * a promises-style document loader is used.
 *
 * @param url the URL to load.
 * @param callback(err, remoteDoc) called once the operation completes,
 *          if using a non-promises API.
 *
 * @return a promise, if using a promises API.
 */
Object.defineProperty(jsonld, 'documentLoader', {
  get: () => jsonld._documentLoader,
  set: v => jsonld._documentLoader = util.normalizeDocumentLoader(v)
});
// default document loader not implemented
jsonld.documentLoader = async url => {
  throw new JsonLdError(
    'Could not retrieve a JSON-LD document from the URL. URL ' +
    'dereferencing not implemented.', 'jsonld.LoadDocumentError',
    {code: 'loading document failed', url: url});
};

/**
 * Deprecated default document loader. Do not use or override.
 */
jsonld.loadDocument = util.callbackify(async function() {
  return jsonld.documentLoader.apply(null, arguments);
});

/**
 * Gets a remote JSON-LD document using the default document loader or
 * one given in the passed options.
 *
 * @param url the URL to fetch.
 * @param [options] the options to use:
 *          [documentLoader] the document loader to use.
 * @param [callback(err, remoteDoc)] called once the operation completes.
 *
 * @return a Promise that resolves to the retrieved remote document.
 */
jsonld.get = util.callbackify(async function(url, options) {
  let load;
  if(options.documentLoader === 'function') {
    load = util.normalizeDocumentLoader(options.documentLoader);
  } else {
    load = jsonld.documentLoader;
  }

  const remoteDoc = await load(url);

  try {
    if(!remoteDoc.document) {
      throw new JsonLdError(
        'No remote document found at the given URL.',
        'jsonld.NullRemoteDocument');
    }
    if(_isString(remoteDoc.document)) {
      remoteDoc.document = JSON.parse(remoteDoc.document);
    }
  } catch(e) {
    throw new JsonLdError(
      'Could not retrieve a JSON-LD document from the URL.',
      'jsonld.LoadDocumentError', {
        code: 'loading document failed',
        cause: e,
        remoteDoc: remoteDoc
      });
  }

  return remoteDoc;
});

/* Promises API */

/**
 * Creates a new promises API object.
 *
 * @param [options] the options to use:
 *          [api] an object to attach the API to.
 *          [version] 'json-ld-1.0' to output a standard JSON-LD 1.0 promises
 *            API, 'jsonld.js' to output the same with augmented proprietary
 *            methods (default: 'jsonld.js')
 *
 * @return the promises API object.
 */
jsonld.promises = function(options) {
  options = options || {};
  var slice = Array.prototype.slice;
  var promisify = jsonld.promisify;

  // handle 'api' option as version, set defaults
  var api = options.api || {};
  var version = options.version || 'jsonld.js';
  if(typeof options.api === 'string') {
    if(!options.version) {
      version = options.api;
    }
    api = {};
  }

  // The Web IDL test harness will check the number of parameters defined in
  // the functions below. The number of parameters must exactly match the
  // required (non-optional) parameters of the JsonLdProcessor interface as
  // defined here:
  // https://www.w3.org/TR/json-ld-api/#the-jsonldprocessor-interface

  api.expand = function(input) {
    if(arguments.length < 1) {
      return jsonld.Promise.reject(
        new TypeError('Could not expand, too few arguments.'));
    }
    return promisify.apply(null, [jsonld.expand].concat(slice.call(arguments)));
  };
  api.compact = function(input, ctx) {
    if(arguments.length < 2) {
      return jsonld.Promise.reject(
        new TypeError('Could not compact, too few arguments.'));
    }
    var compact = function(input, ctx, options, callback) {
      if(typeof options === 'function') {
        callback = options;
        options = {};
      }
      options = options || {};
      // ensure only one value is returned in callback
      jsonld.compact(input, ctx, options, function(err, compacted) {
        callback(err, compacted);
      });
    };
    return promisify.apply(null, [compact].concat(slice.call(arguments)));
  };
  api.flatten = function(input) {
    if(arguments.length < 1) {
      return jsonld.Promise.reject(
        new TypeError('Could not flatten, too few arguments.'));
    }
    return promisify.apply(
      null, [jsonld.flatten].concat(slice.call(arguments)));
  };
  api.frame = function(input, frame) {
    if(arguments.length < 2) {
      return jsonld.Promise.reject(
        new TypeError('Could not frame, too few arguments.'));
    }
    return promisify.apply(null, [jsonld.frame].concat(slice.call(arguments)));
  };
  api.fromRDF = function(dataset) {
    if(arguments.length < 1) {
      return jsonld.Promise.reject(
        new TypeError('Could not convert from RDF, too few arguments.'));
    }
    return jsonld.fromRDF.apply(null, arguments);
  };
  api.toRDF = function(input) {
    if(arguments.length < 1) {
      return jsonld.Promise.reject(
        new TypeError('Could not convert to RDF, too few arguments.'));
    }
    return jsonld.toRDF.apply(null, arguments);
  };
  api.normalize = function(input) {
    if(arguments.length < 1) {
      return jsonld.Promise.reject(
        new TypeError('Could not normalize, too few arguments.'));
    }
    return promisify.apply(
      null, [jsonld.normalize].concat(slice.call(arguments)));
  };

  if(version === 'jsonld.js') {
    api.link = function(input, ctx) {
      if(arguments.length < 2) {
        return jsonld.Promise.reject(
          new TypeError('Could not link, too few arguments.'));
      }
      return promisify.apply(
        null, [jsonld.link].concat(slice.call(arguments)));
    };
    api.objectify = function(input) {
      return promisify.apply(
        null, [jsonld.objectify].concat(slice.call(arguments)));
    };
    api.createNodeMap = function(input) {
      return promisify.apply(
        null, [jsonld.createNodeMap].concat(slice.call(arguments)));
    };
    api.merge = function(input) {
      return promisify.apply(
        null, [jsonld.merge].concat(slice.call(arguments)));
    };
  }

  try {
    jsonld.Promise = global.Promise || require('es6-promise').Promise;
  } catch(e) {
    var f = function() {
      throw new Error('Unable to find a Promise implementation.');
    };
    for(var method in api) {
      api[method] = f;
    }
  }

  return api;
};

/* Utility API */
Object.assign(jsonld, util);

// extend jsonld.promises w/jsonld.js methods
jsonld.promises({api: jsonld.promises});

/* WebIDL API */
const JsonLdProcessor = require('./JsonLdProcessor')(jsonld.promises);

// setup browser global JsonLdProcessor
if(_browser && typeof global.JsonLdProcessor === 'undefined') {
  Object.defineProperty(global, 'JsonLdProcessor', {
    writable: true,
    enumerable: false,
    configurable: true,
    value: JsonLdProcessor
  });
}

jsonld.RequestQueue = require('./RequestQueue');

/**
 * Document loaders.
 */
jsonld.documentLoaders = {};
jsonld.documentLoaders.node = require('./documentLoaders/node');
jsonld.documentLoaders.xhr = require('./documentLoaders/xhr');

/**
 * Assigns the default document loader for external document URLs to a built-in
 * default. Supported types currently include: 'xhr' and 'node'.
 *
 * @param type the type to set.
 * @param [params] the parameters required to use the document loader.
 */
jsonld.useDocumentLoader = function(type) {
  if(!(type in jsonld.documentLoaders)) {
    throw new JsonLdError(
      'Unknown document loader type: "' + type + '"',
      'jsonld.UnknownDocumentLoader',
      {type: type});
  }

  // set document loader
  jsonld.documentLoader = util.normalizeDocumentLoader(
    jsonld.documentLoaders[type].apply(
      jsonld, Array.prototype.slice.call(arguments, 1)));
};

/**
 * Processes a local context, resolving any URLs as necessary, and returns a
 * new active context in its callback.
 *
 * @param activeCtx the current active context.
 * @param localCtx the local context to process.
 * @param [options] the options to use:
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param [callback(err, activeCtx)] called once the operation completes.
 *
 * @return a Promise that resolves to the new active context.
 */
jsonld.processContext = util.callbackify(async function(
  activeCtx, localCtx, options) {
  // set default options
  if(typeof options === 'function') {
    options = {};
  } else {
    options = options || {};
  }
  if(!('base' in options)) {
    options.base = '';
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }

  // return initial context early for null context
  if(localCtx === null) {
    return _getInitialContext(options);
  }

  // get URLs in localCtx
  localCtx = _clone(localCtx);
  if(!(_isObject(localCtx) && '@context' in localCtx)) {
    localCtx = {'@context': localCtx};
  }
  let ctx = await _getAllContexts(localCtx, options);

  return _processContext({activeCtx, localCtx: ctx, options});
});

jsonld.getContextValue = require('./context').getContextValue;

/** Registered RDF dataset parsers hashed by content-type. */
var _rdfParsers = {};

/**
 * Registers an RDF dataset parser by content-type, for use with
 * jsonld.fromRDF. An RDF dataset parser will always be given two parameters,
 * a string of input and a callback. An RDF dataset parser can be synchronous
 * or asynchronous.
 *
 * If the parser function returns undefined or null then it will be assumed to
 * be asynchronous w/a continuation-passing style and the callback parameter
 * given to the parser MUST be invoked.
 *
 * If it returns a Promise, then it will be assumed to be asynchronous, but the
 * callback parameter MUST NOT be invoked. It should instead be ignored.
 *
 * If it returns an RDF dataset, it will be assumed to be synchronous and the
 * callback parameter MUST NOT be invoked. It should instead be ignored.
 *
 * @param contentType the content-type for the parser.
 * @param parser(input, callback(err, dataset)) the parser function (takes a
 *          string as a parameter and either returns null/undefined and uses
 *          the given callback, returns a Promise, or returns an RDF dataset).
 */
jsonld.registerRDFParser = function(contentType, parser) {
  _rdfParsers[contentType] = parser;
};

/**
 * Unregisters an RDF dataset parser by content-type.
 *
 * @param contentType the content-type for the parser.
 */
jsonld.unregisterRDFParser = function(contentType) {
  delete _rdfParsers[contentType];
};

const JsonLdError = require('./JsonLdError');

/**
 * Removes the @preserve keywords as the last step of the framing algorithm.
 *
 * @param ctx the active context used to compact the input.
 * @param input the framed, compacted output.
 * @param options the compaction options used.
 *
 * @return the resulting output.
 */
function _removePreserve(ctx, input, options) {
  // recurse through arrays
  if(_isArray(input)) {
    var output = [];
    for(var i = 0; i < input.length; ++i) {
      var result = _removePreserve(ctx, input[i], options);
      // drop nulls from arrays
      if(result !== null) {
        output.push(result);
      }
    }
    input = output;
  } else if(_isObject(input)) {
    // remove @preserve
    if('@preserve' in input) {
      if(input['@preserve'] === '@null') {
        return null;
      }
      return input['@preserve'];
    }

    // skip @values
    if(_isValue(input)) {
      return input;
    }

    // recurse through @lists
    if(_isList(input)) {
      input['@list'] = _removePreserve(ctx, input['@list'], options);
      return input;
    }

    // handle in-memory linked nodes
    var idAlias = _compactIri({activeCtx: ctx, iri: '@id'});
    if(idAlias in input) {
      var id = input[idAlias];
      if(id in options.link) {
        var idx = options.link[id].indexOf(input);
        if(idx === -1) {
          // prevent circular visitation
          options.link[id].push(input);
        } else {
          // already visited
          return options.link[id][idx];
        }
      } else {
        // prevent circular visitation
        options.link[id] = [input];
      }
    }

    // recurse through properties
    for(var prop in input) {
      var result = _removePreserve(ctx, input[prop], options);
      var container = jsonld.getContextValue(ctx, prop, '@container');
      if(options.compactArrays && _isArray(result) && result.length === 1 &&
        container === null) {
        result = result[0];
      }
      input[prop] = result;
    }
  }
  return input;
}

// register the N-Quads RDF parser
jsonld.registerRDFParser('application/nquads', NQuads.parse);

// register the RDFa API RDF parser
jsonld.registerRDFParser('rdfa-api', Rdfa.parse);

/* URL API */
jsonld.url = require('./url');

if(_nodejs) {
  // use node document loader by default
  jsonld.useDocumentLoader('node');
} else if(typeof XMLHttpRequest !== 'undefined') {
  // use xhr document loader by default
  jsonld.useDocumentLoader('xhr');
}

if(_nodejs) {
  jsonld.use = function(extension) {
    switch(extension) {
      // TODO: Deprecated as of 0.4.0. Remove at some point.
      case 'request':
        // use node JSON-LD request extension
        jsonld.request = require('jsonld-request');
        break;
      default:
        throw new JsonLdError(
          'Unknown extension.',
          'jsonld.UnknownExtension', {extension: extension});
    }
  };

  // expose version
  var _module = {exports: {}, filename: __dirname};
  require('pkginfo')(_module, 'version');
  jsonld.version = _module.exports.version;
}

// end of jsonld API factory
return jsonld;
};

// external APIs:

// used to generate a new jsonld API instance
var factory = function() {
  return wrapper(function() {
    return factory();
  });
};

if(!_nodejs && (typeof define === 'function' && define.amd)) {
  // export AMD API
  define([], function() {
    // now that module is defined, wrap main jsonld API instance
    wrapper(factory);
    return factory;
  });
} else {
  // wrap the main jsonld API instance
  wrapper(factory);

  if(typeof require === 'function' &&
    typeof module !== 'undefined' && module.exports) {
    // export CommonJS/nodejs API
    module.exports = factory;
  }

  if(_browser) {
    // export simple browser API
    if(typeof jsonld === 'undefined') {
      jsonld = jsonldjs = factory;
    } else {
      jsonldjs = factory;
    }
  }
}

return factory;

})();
