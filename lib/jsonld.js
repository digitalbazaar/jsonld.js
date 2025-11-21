/**
 * A JavaScript implementation of the JSON-LD API.
 *
 * @author Dave Longley
 *
 * @license BSD 3-Clause License
 * Copyright (c) 2011-2022 Digital Bazaar, Inc.
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
const canonize = require('rdf-canonize');
const platform = require('./platform');
const util = require('./util');
const ContextResolver = require('./ContextResolver');
const IdentifierIssuer = util.IdentifierIssuer;
const JsonLdError = require('./JsonLdError');
const LRU = require('lru-cache');
const NQuads = require('./NQuads');

const {expand: _expand} = require('./expand');
const {flatten: _flatten} = require('./flatten');
const {fromRDF: _fromRDF} = require('./fromRdf');
const {toRDF: _toRDF} = require('./toRdf');

const {
  frameMergedOrDefault: _frameMergedOrDefault,
  cleanupNull: _cleanupNull
} = require('./frame');

const {
  isArray: _isArray,
  isObject: _isObject,
  isString: _isString
} = require('./types');

const {
  isSubjectReference: _isSubjectReference,
} = require('./graphTypes');

const {
  expandIri: _expandIri,
  getInitialContext: _getInitialContext,
  process: _processContext,
  processingMode: _processingMode
} = require('./context');

const {
  compact: _compact,
  compactIri: _compactIri
} = require('./compact');

const {
  createNodeMap: _createNodeMap,
  createMergedNodeMap: _createMergedNodeMap,
  mergeNodeMaps: _mergeNodeMaps
} = require('./nodeMap');

const {
  logEventHandler: _logEventHandler,
  logWarningEventHandler: _logWarningEventHandler,
  safeEventHandler: _safeEventHandler,
  setDefaultEventHandler: _setDefaultEventHandler,
  setupEventHandler: _setupEventHandler,
  strictEventHandler: _strictEventHandler,
  unhandledEventHandler: _unhandledEventHandler
} = require('./events');

/* eslint-disable indent */
// attaches jsonld API to the given object
const wrapper = function(jsonld) {

/** Registered RDF dataset parsers hashed by content-type. */
const _rdfParsers = {};

// resolved context cache
// TODO: consider basing max on context size rather than number
const RESOLVED_CONTEXT_CACHE_MAX_SIZE = 100;
const _resolvedContextCache = new LRU({max: RESOLVED_CONTEXT_CACHE_MAX_SIZE});

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
 *          [compactToRelative] true to compact IRIs to be relative to document
 *            base, false to keep absolute (default: true)
 *          [graph] true to always output a top-level graph (default: false).
 *          [expandContext] a context to expand with.
 *          [skipExpansion] true to assume the input is expanded and skip
 *            expansion, false not to, defaults to false. Some well-formed
 *            and safe-mode checks may be omitted.
 *          [documentLoader(url, options)] the document loader.
 *          [framing] true if compaction is occurring during a framing
 *            operation.
 *          [safe] true to use safe mode. (default: false)
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the compacted output.
 */
jsonld.compact = async function(input, ctx, options) {
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
  options = _setDefaults(options, {
    base: _isString(input) ? input : '',
    compactArrays: true,
    compactToRelative: true,
    graph: false,
    skipExpansion: false,
    link: false,
    issuer: new IdentifierIssuer('_:b'),
    contextResolver: new ContextResolver(
      {sharedCache: _resolvedContextCache})
  });
  if(options.link) {
    // force skip expansion when linking, "link" is not part of the public
    // API, it should only be called from framing
    options.skipExpansion = true;
  }
  if(!options.compactToRelative) {
    delete options.base;
  }

  // expand input
  let expanded;
  if(options.skipExpansion) {
    expanded = input;
  } else {
    expanded = await jsonld.expand(input, options);
  }

  // process context
  const activeCtx = await jsonld.processContext(
    _getInitialContext(options), ctx, options);

  // do compaction
  let compacted = await _compact({
    activeCtx,
    element: expanded,
    options
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
  ctx = util.clone(ctx);
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
    const graphAlias = _compactIri({
      activeCtx, iri: '@graph', relativeTo: {vocab: true}
    });
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
    for(const key in graph) {
      compacted[key] = graph[key];
    }
  }

  return compacted;
};

/**
 * Performs JSON-LD expansion.
 *
 * @param input the JSON-LD input to expand.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [keepFreeFloatingNodes] true to keep free-floating nodes,
 *            false not to, defaults to false.
 *          [documentLoader(url, options)] the document loader.
 *          [safe] true to use safe mode. (default: false)
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the expanded output.
 */
jsonld.expand = async function(input, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not expand, too few arguments.');
  }

  // set default options
  options = _setDefaults(options, {
    keepFreeFloatingNodes: false,
    contextResolver: new ContextResolver(
      {sharedCache: _resolvedContextCache})
  });

  // build set of objects that may have @contexts to resolve
  const toResolve = {};

  // build set of contexts to process prior to expansion
  const contextsToProcess = [];

  // if an `expandContext` has been given ensure it gets resolved
  if('expandContext' in options) {
    const expandContext = util.clone(options.expandContext);
    if(_isObject(expandContext) && '@context' in expandContext) {
      toResolve.expandContext = expandContext;
    } else {
      toResolve.expandContext = {'@context': expandContext};
    }
    contextsToProcess.push(toResolve.expandContext);
  }

  // if input is a string, attempt to dereference remote document
  let defaultBase;
  if(!_isString(input)) {
    // input is not a URL, do not need to retrieve it first
    toResolve.input = util.clone(input);
  } else {
    // load remote doc
    const remoteDoc = await jsonld.get(input, options);
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

  // process any additional contexts
  let activeCtx = _getInitialContext(options);
  for(const localCtx of contextsToProcess) {
    activeCtx = await _processContext({activeCtx, localCtx, options});
  }

  // expand resolved input
  let expanded = await _expand({
    activeCtx,
    element: toResolve.input,
    options
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
};

/**
 * Performs JSON-LD flattening.
 *
 * @param input the JSON-LD to flatten.
 * @param ctx the context to use to compact the flattened output, or null.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [documentLoader(url, options)] the document loader.
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the flattened output.
 */
jsonld.flatten = async function(input, ctx, options) {
  if(arguments.length < 1) {
    return new TypeError('Could not flatten, too few arguments.');
  }

  if(typeof ctx === 'function') {
    ctx = null;
  } else {
    ctx = ctx || null;
  }

  // set default options
  options = _setDefaults(options, {
    base: _isString(input) ? input : '',
    contextResolver: new ContextResolver(
      {sharedCache: _resolvedContextCache})
  });

  // expand input
  const expanded = await jsonld.expand(input, options);

  // do flattening
  const flattened = _flatten(expanded);

  if(ctx === null) {
    // no compaction required
    return flattened;
  }

  // compact result (force @graph option to true, skip expansion)
  options.graph = true;
  options.skipExpansion = true;
  const compacted = await jsonld.compact(flattened, ctx, options);

  return compacted;
};

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
 *          [documentLoader(url, options)] the document loader.
 *          [safe] true to use safe mode. (default: false)
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the framed output.
 */
jsonld.frame = async function(input, frame, options) {
  if(arguments.length < 2) {
    throw new TypeError('Could not frame, too few arguments.');
  }

  // set default options
  options = _setDefaults(options, {
    base: _isString(input) ? input : '',
    embed: '@once',
    explicit: false,
    requireAll: false,
    omitDefault: false,
    bnodesToClear: [],
    contextResolver: new ContextResolver(
      {sharedCache: _resolvedContextCache})
  });

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

  const frameContext = frame ? frame['@context'] || {} : {};

  // process context
  const activeCtx = await jsonld.processContext(
    _getInitialContext(options), frameContext, options);

  // mode specific defaults
  if(!options.hasOwnProperty('omitGraph')) {
    options.omitGraph = _processingMode(activeCtx, 1.1);
  }
  if(!options.hasOwnProperty('pruneBlankNodeIdentifiers')) {
    options.pruneBlankNodeIdentifiers = _processingMode(activeCtx, 1.1);
  }

  // expand input
  const expanded = await jsonld.expand(input, options);

  // expand frame
  const opts = {...options};
  opts.isFrame = true;
  opts.keepFreeFloatingNodes = true;
  const expandedFrame = await jsonld.expand(frame, opts);

  // if the unexpanded frame includes a key expanding to @graph, frame the
  // default graph, otherwise, the merged graph
  const frameKeys = Object.keys(frame)
    .map(key => _expandIri(activeCtx, key, {vocab: true}));
  opts.merged = !frameKeys.includes('@graph');
  opts.is11 = _processingMode(activeCtx, 1.1);

  // do framing
  const framed = _frameMergedOrDefault(expanded, expandedFrame, opts);

  opts.graph = !options.omitGraph;
  opts.skipExpansion = true;
  opts.link = {};
  opts.framing = true;
  let compacted = await jsonld.compact(framed, frameContext, opts);

  // replace @null with null, compacting arrays
  opts.link = {};
  compacted = _cleanupNull(compacted, opts);

  return compacted;
};

/**
 * **Experimental**
 *
 * Links a JSON-LD document's nodes in memory.
 *
 * @param input the JSON-LD document to link.
 * @param [ctx] the JSON-LD context to apply.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [documentLoader(url, options)] the document loader.
 *          [safe] true to use safe mode. (default: false)
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the linked output.
 */
jsonld.link = async function(input, ctx, options) {
  // API matches running frame with a wildcard frame and embed: '@link'
  // get arguments
  const frame = {};
  if(ctx) {
    frame['@context'] = ctx;
  }
  frame['@embed'] = '@link';
  return jsonld.frame(input, frame, options);
};

/**
 * Performs RDF dataset normalization on the given input. The input is JSON-LD
 * unless the 'inputFormat' option is used. The output is an RDF dataset
 * unless a non-null 'format' option is used.
 *
 * Note: Canonicalization sets `safe` to `true` and `base` to `null` by
 * default in order to produce safe outputs and "fail closed" by default. This
 * is different from the other API transformations in this version which
 * allow unsafe defaults (for cryptographic usage) in order to comply with the
 * JSON-LD 1.1 specification.
 *
 * @param input the input to normalize as JSON-LD given as an RDF dataset or as
 *          a format specified by the 'inputFormat' option.
 * @param [options] the options to use:
 *          [base] the base IRI to use (default: `null`).
 *          [expandContext] a context to expand with.
 *          [skipExpansion] true to assume the input is expanded and skip
 *            expansion, false not to, defaults to false. Some well-formed
 *            and safe-mode checks may be omitted.
 *          [inputFormat] the input format. null for a JSON-LD object,
 *            'application/n-quads' for N-Quads. (default: null)
 *          [format] the output format. null for an RDF dataset,
 *            'application/n-quads' for an N-Quads string. (default: N-Quads)
 *          [documentLoader(url, options)] the document loader.
 *          [rdfDirection] null or 'i18n-datatype' to support RDF
 *             transformation of @direction (default: null).
 *          [safe] true to use safe mode. (default: true).
 *          [canonizeOptions] options to pass to rdf-canonize canonize(). See
 *            rdf-canonize for more details. Commonly used options, and their
 *            defaults, are:
 *            algorithm="RDFC-1.0",
 *            messageDigestAlgorithm="sha256",
 *            canonicalIdMap,
 *            maxWorkFactor=1,
 *            maxDeepIterations=-1,
 *            and signal=null.
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the normalized output.
 */
jsonld.normalize = jsonld.canonize = async function(input, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not canonize, too few arguments.');
  }

  // set toRDF options
  options = _setDefaults(options, {
    skipExpansion: false,
    safe: true,
    contextResolver: new ContextResolver(
      {sharedCache: _resolvedContextCache})
  });

  // set canonize options
  const canonizeOptions = Object.assign({}, {
    algorithm: 'RDFC-1.0'
  }, options.canonizeOptions || null);

  if('inputFormat' in options) {
    if(options.inputFormat !== 'application/n-quads') {
      throw new JsonLdError(
        'Unknown canonicalization input format.',
        'jsonld.CanonizeError');
    }
    // TODO: `await` for async parsers
    const parsedInput = NQuads.parse(input);

    // do canonicalization
    return canonize.canonize(parsedInput, canonizeOptions);
  }

  // convert to RDF dataset then do normalization
  const opts = {...options};
  delete opts.format;
  delete opts.canonizeOptions;
  opts.produceGeneralizedRdf = false;
  const dataset = await jsonld.toRDF(input, opts);

  // do canonicalization
  return canonize.canonize(dataset, canonizeOptions);
};

/**
 * Converts an RDF dataset to JSON-LD.
 *
 * @param dataset a serialized string of RDF in a format specified by the
 *          format option or an RDF dataset to convert.
 * @param [options] the options to use:
 *          [format] the format if dataset param must first be parsed:
 *            'application/n-quads' for N-Quads (default).
 *          [rdfParser] a custom RDF-parser to use to parse the dataset.
 *          [useRdfType] true to use rdf:type, false to use @type
 *            (default: false).
 *          [useNativeTypes] true to convert XSD types into native types
 *            (boolean, integer, double), false not to (default: false).
 *          [rdfDirection] null or 'i18n-datatype' to support RDF
 *             transformation of @direction (default: null).
 *          [safe] true to use safe mode. (default: false)
 *
 * @return a Promise that resolves to the JSON-LD document.
 */
jsonld.fromRDF = async function(dataset, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not convert from RDF, too few arguments.');
  }

  // set default options
  options = _setDefaults(options, {
    format: _isString(dataset) ? 'application/n-quads' : undefined
  });

  const {format} = options;
  let {rdfParser} = options;

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

  // rdfParser must be synchronous or return a promise, no callback support
  const parsedDataset = await rdfParser(dataset);
  return _fromRDF(parsedDataset, options);
};

/**
 * Outputs the RDF dataset found in the given JSON-LD object.
 *
 * @param input the JSON-LD input.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [skipExpansion] true to assume the input is expanded and skip
 *            expansion, false not to, defaults to false. Some well-formed
 *            and safe-mode checks may be omitted.
 *          [format] the output format. null for an RDF dataset,
 *            'application/n-quads' for an N-Quads string. (default: null)
 *          [produceGeneralizedRdf] true to output generalized RDF, false
 *            to produce only standard RDF (default: false).
 *          [documentLoader(url, options)] the document loader.
 *          [safe] true to use safe mode. (default: false)
 *          [rdfDirection] null or 'i18n-datatype' to support RDF
 *             transformation of @direction (default: null).
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the RDF dataset.
 */
jsonld.toRDF = async function(input, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not convert to RDF, too few arguments.');
  }

  // set default options
  options = _setDefaults(options, {
    skipExpansion: false,
    contextResolver: new ContextResolver(
      {sharedCache: _resolvedContextCache})
  });

  // TODO: support toRDF custom map?
  let expanded;
  if(options.skipExpansion) {
    expanded = input;
  } else {
    // expand input
    expanded = await jsonld.expand(input, options);
  }

  // output RDF dataset
  const dataset = _toRDF(expanded, options);
  if(options.format) {
    if(options.format === 'application/n-quads') {
      return NQuads.serialize(dataset);
    }
    throw new JsonLdError(
      'Unknown output format.',
      'jsonld.UnknownFormat', {format: options.format});
  }

  return dataset;
};

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
 *          [documentLoader(url, options)] the document loader.
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the merged node map.
 */
jsonld.createNodeMap = async function(input, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not create node map, too few arguments.');
  }

  // set default options
  options = _setDefaults(options, {
    base: _isString(input) ? input : '',
    contextResolver: new ContextResolver(
      {sharedCache: _resolvedContextCache})
  });

  // expand input
  const expanded = await jsonld.expand(input, options);

  return _createMergedNodeMap(expanded, options);
};

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
 *          [documentLoader(url, options)] the document loader.
 *          [safe] true to use safe mode. (default: false)
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the merged output.
 */
jsonld.merge = async function(docs, ctx, options) {
  if(arguments.length < 1) {
    throw new TypeError('Could not merge, too few arguments.');
  }
  if(!_isArray(docs)) {
    throw new TypeError('Could not merge, "docs" must be an array.');
  }

  if(typeof ctx === 'function') {
    ctx = null;
  } else {
    ctx = ctx || null;
  }

  // set default options
  options = _setDefaults(options, {
    contextResolver: new ContextResolver(
      {sharedCache: _resolvedContextCache})
  });

  // expand all documents
  const expanded = await Promise.all(docs.map(doc => {
    const opts = {...options};
    return jsonld.expand(doc, opts);
  }));

  let mergeNodes = true;
  if('mergeNodes' in options) {
    mergeNodes = options.mergeNodes;
  }

  const issuer = options.issuer || new IdentifierIssuer('_:b');
  const graphs = {'@default': {}};

  for(let i = 0; i < expanded.length; ++i) {
    // uniquely relabel blank nodes
    const doc = util.relabelBlankNodes(expanded[i], {
      issuer: new IdentifierIssuer('_:b' + i + '-')
    });

    // add nodes to the shared node map graphs if merging nodes, to a
    // separate graph set if not
    const _graphs = (mergeNodes || i === 0) ? graphs : {'@default': {}};
    _createNodeMap(doc, _graphs, '@default', issuer);

    if(_graphs !== graphs) {
      // merge document graphs but don't merge existing nodes
      for(const graphName in _graphs) {
        const _nodeMap = _graphs[graphName];
        if(!(graphName in graphs)) {
          graphs[graphName] = _nodeMap;
          continue;
        }
        const nodeMap = graphs[graphName];
        for(const key in _nodeMap) {
          if(!(key in nodeMap)) {
            nodeMap[key] = _nodeMap[key];
          }
        }
      }
    }
  }

  // add all non-default graphs to default graph
  const defaultGraph = _mergeNodeMaps(graphs);

  // produce flattened output
  const flattened = [];
  const keys = Object.keys(defaultGraph).sort();
  for(let ki = 0; ki < keys.length; ++ki) {
    const node = defaultGraph[keys[ki]];
    // only add full subjects to top-level
    if(!_isSubjectReference(node)) {
      flattened.push(node);
    }
  }

  if(ctx === null) {
    return flattened;
  }

  // compact result (force @graph option to true, skip expansion)
  options.graph = true;
  options.skipExpansion = true;
  const compacted = await jsonld.compact(flattened, ctx, options);

  return compacted;
};

/**
 * The default document loader for external documents.
 *
 * @param url the URL to load.
 *
 * @return a promise that resolves to the remote document.
 */
Object.defineProperty(jsonld, 'documentLoader', {
  get: () => jsonld._documentLoader,
  set: v => jsonld._documentLoader = v
});
// default document loader not implemented
jsonld.documentLoader = async url => {
  throw new JsonLdError(
    'Could not retrieve a JSON-LD document from the URL. URL ' +
    'dereferencing not implemented.', 'jsonld.LoadDocumentError',
    {code: 'loading document failed', url});
};

/**
 * Gets a remote JSON-LD document using the default document loader or
 * one given in the passed options.
 *
 * @param url the URL to fetch.
 * @param [options] the options to use:
 *          [documentLoader] the document loader to use.
 *
 * @return a Promise that resolves to the retrieved remote document.
 */
jsonld.get = async function(url, options) {
  let load;
  if(typeof options.documentLoader === 'function') {
    load = options.documentLoader;
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
        remoteDoc
      });
  }

  return remoteDoc;
};

/**
 * Processes a local context, resolving any URLs as necessary, and returns a
 * new active context.
 *
 * @param activeCtx the current active context.
 * @param localCtx the local context to process.
 * @param [options] the options to use:
 *          [documentLoader(url, options)] the document loader.
 *          [safe] true to use safe mode. (default: false)
 *          [contextResolver] internal use only.
 *
 * @return a Promise that resolves to the new active context.
 */
jsonld.processContext = async function(
  activeCtx, localCtx, options) {
  // set default options
  options = _setDefaults(options, {
    base: '',
    contextResolver: new ContextResolver(
      {sharedCache: _resolvedContextCache})
  });

  // return initial context early for null context
  if(localCtx === null) {
    return _getInitialContext(options);
  }

  // get URLs in localCtx
  localCtx = util.clone(localCtx);
  if(!(_isObject(localCtx) && '@context' in localCtx)) {
    localCtx = {'@context': localCtx};
  }

  return _processContext({activeCtx, localCtx, options});
};

// backwards compatibility
jsonld.getContextValue = require('./context').getContextValue;

/**
 * Document loaders.
 */
jsonld.documentLoaders = {};

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
      {type});
  }

  // set document loader
  jsonld.documentLoader = jsonld.documentLoaders[type].apply(
    jsonld, Array.prototype.slice.call(arguments, 1));
};

/**
 * Registers an RDF dataset parser by content-type, for use with
 * jsonld.fromRDF. An RDF dataset parser will always be given one parameter,
 * a string of input. An RDF dataset parser can be synchronous or
 * asynchronous (by returning a promise).
 *
 * @param contentType the content-type for the parser.
 * @param parser(input) the parser function (takes a string as a parameter
 *          and either returns an RDF dataset or a Promise that resolves to one.
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

// register the N-Quads RDF parser
jsonld.registerRDFParser('application/n-quads', NQuads.parse);

/* URL API */
jsonld.url = require('./url');

/* Events API and handlers */
jsonld.logEventHandler = _logEventHandler;
jsonld.logWarningEventHandler = _logWarningEventHandler;
jsonld.safeEventHandler = _safeEventHandler;
jsonld.setDefaultEventHandler = _setDefaultEventHandler;
jsonld.strictEventHandler = _strictEventHandler;
jsonld.unhandledEventHandler = _unhandledEventHandler;

/* Utility API */
jsonld.util = util;
// backwards compatibility
Object.assign(jsonld, util);

// reexpose API as jsonld.promises for backwards compatibility
jsonld.promises = jsonld;

// backwards compatibility
jsonld.RequestQueue = require('./RequestQueue');

/* WebIDL API */
jsonld.JsonLdProcessor = require('./JsonLdProcessor')(jsonld);

platform.setupGlobals(jsonld);
platform.setupDocumentLoaders(jsonld);

function _setDefaults(options, {
  documentLoader = jsonld.documentLoader,
  ...defaults
}) {
  // fail if obsolete options present
  if(options && 'compactionMap' in options) {
    throw new JsonLdError(
      '"compactionMap" not supported.',
      'jsonld.OptionsError');
  }
  if(options && 'expansionMap' in options) {
    throw new JsonLdError(
      '"expansionMap" not supported.',
      'jsonld.OptionsError');
  }
  return Object.assign(
    {},
    {documentLoader},
    defaults,
    options,
    {eventHandler: _setupEventHandler({options})}
  );
}

// end of jsonld API `wrapper` factory
return jsonld;
};

// external APIs:

// used to generate a new jsonld API instance
const factory = function() {
  return wrapper(function() {
    return factory();
  });
};

// wrap the main jsonld API instance
wrapper(factory);
// export API
module.exports = factory;
