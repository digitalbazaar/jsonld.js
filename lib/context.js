/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const util = require('./util');
const ActiveContextCache = require('./ActiveContextCache');
const JsonLdError = require('./JsonLdError');

const {
  isArray: _isArray,
  isObject: _isObject,
  isString: _isString,
  isUndefined: _isUndefined
} = require('./types');

const {
  isAbsolute: _isAbsoluteIri,
  isRelative: _isRelativeIri,
  prependBase,
  parse: parseUrl
} = require('./url');

const {
  asArray: _asArray,
  compareShortestLeast: _compareShortestLeast
} = require('./util');

const MAX_CONTEXT_URLS = 10;

const INITIAL_CONTEXT_CACHE = new Map();
const INITIAL_CONTEXT_CACHE_MAX_SIZE = 10000;

const api = {};
module.exports = api;

api.cache = new ActiveContextCache();

/**
 * Processes a local context and returns a new active context.
 *
 * @param activeCtx the current active context.
 * @param localCtx the local context to process.
 * @param options the context processing options.
 *
 * @return the new active context.
 */
api.process = ({activeCtx, localCtx, options,
  propertyTermDefinition = false}) => {
  // normalize local context to an array of @context objects
  if(_isObject(localCtx) && '@context' in localCtx &&
    _isArray(localCtx['@context'])) {
    localCtx = localCtx['@context'];
  }
  const ctxs = _isArray(localCtx) ? localCtx : [localCtx];

  // no contexts in array, return current active context w/o changes
  if(ctxs.length === 0) {
    return activeCtx;
  }

  // process each context in order, update active context
  // on each iteration to ensure proper caching
  let rval = activeCtx;
  for(let i = 0; i < ctxs.length; ++i) {
    let ctx = ctxs[i];

    // reset to initial context
    if(ctx === null) {
      // We can't nullify if there are protected terms and we're
      // not in a term definition
      if(!propertyTermDefinition &&
         Object.keys(activeCtx.protected).length !== 0) {
        throw new JsonLdError(
          'Tried to nullify a context with protected terms outside of ' +
          'a term definition.',
          'jsonld.SyntaxError',
          {code: 'invalid context nullification'});
      }
      rval = activeCtx = api.getInitialContext(options);
      continue;
    }

    // dereference @context key if present
    if(_isObject(ctx) && '@context' in ctx) {
      ctx = ctx['@context'];
    }

    // context must be an object by now, all URLs retrieved before this call
    if(!_isObject(ctx)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context must be an object.',
        'jsonld.SyntaxError', {code: 'invalid local context', context: ctx});
    }

    // get context from cache if available
    if(api.cache) {
      const cached = api.cache.get(activeCtx, ctx);
      if(cached) {
        rval = activeCtx = cached;
        continue;
      }
    }

    // update active context and clone new one before updating
    activeCtx = rval;
    rval = rval.clone();

    // define context mappings for keys in local context
    const defined = {};

    // handle @version
    if('@version' in ctx) {
      if(ctx['@version'] !== 1.1) {
        throw new JsonLdError(
          'Unsupported JSON-LD version: ' + ctx['@version'],
          'jsonld.UnsupportedVersion',
          {code: 'invalid @version value', context: ctx});
      }
      if(activeCtx.processingMode &&
        activeCtx.processingMode === 'json-ld-1.0') {
        throw new JsonLdError(
          '@version: ' + ctx['@version'] + ' not compatible with ' +
          activeCtx.processingMode,
          'jsonld.ProcessingModeConflict',
          {code: 'processing mode conflict', context: ctx});
      }
      rval.processingMode = 'json-ld-1.1';
      rval['@version'] = ctx['@version'];
      defined['@version'] = true;
    }

    // if not set explicitly, set processingMode to "json-ld-1.0"
    rval.processingMode =
      rval.processingMode || activeCtx.processingMode || 'json-ld-1.0';

    // handle @base
    if('@base' in ctx) {
      let base = ctx['@base'];

      if(base === null) {
        // no action
      } else if(_isAbsoluteIri(base)) {
        base = parseUrl(base);
      } else if(_isRelativeIri(base)) {
        base = parseUrl(prependBase(activeCtx['@base'].href, base));
      } else {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; the value of "@base" in a ' +
          '@context must be an absolute IRI, a relative IRI, or null.',
          'jsonld.SyntaxError', {code: 'invalid base IRI', context: ctx});
      }

      rval['@base'] = base;
      defined['@base'] = true;
    }

    // handle @vocab
    if('@vocab' in ctx) {
      const value = ctx['@vocab'];
      if(value === null) {
        delete rval['@vocab'];
      } else if(!_isString(value)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; the value of "@vocab" in a ' +
          '@context must be a string or null.',
          'jsonld.SyntaxError', {code: 'invalid vocab mapping', context: ctx});
      } else if(!_isAbsoluteIri(value)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; the value of "@vocab" in a ' +
          '@context must be an absolute IRI.',
          'jsonld.SyntaxError', {code: 'invalid vocab mapping', context: ctx});
      } else {
        rval['@vocab'] = value;
      }
      defined['@vocab'] = true;
    }

    // handle @language
    if('@language' in ctx) {
      const value = ctx['@language'];
      if(value === null) {
        delete rval['@language'];
      } else if(!_isString(value)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; the value of "@language" in a ' +
          '@context must be a string or null.',
          'jsonld.SyntaxError',
          {code: 'invalid default language', context: ctx});
      } else {
        rval['@language'] = value.toLowerCase();
      }
      defined['@language'] = true;
    }

    // handle @protected; determine whether this sub-context is declaring
    // all its terms to be "protected" (exceptions can be made on a
    // per-definition basis)
    defined['@protected'] = ctx['@protected'] || false;

    // process all other keys
    for(const key in ctx) {
      api.createTermDefinition(rval, ctx, key, defined);
    }

    // cache result
    if(api.cache) {
      api.cache.set(activeCtx, ctx, rval);
    }
  }

  return rval;
};

/**
 * Creates a term definition during context processing.
 *
 * @param activeCtx the current active context.
 * @param localCtx the local context being processed.
 * @param term the term in the local context to define the mapping for.
 * @param defined a map of defining/defined keys to detect cycles and prevent
 *          double definitions.
 */
api.createTermDefinition = (activeCtx, localCtx, term, defined) => {
  if(term in defined) {
    // term already defined
    if(defined[term]) {
      return;
    }
    // cycle detected
    throw new JsonLdError(
      'Cyclical context definition detected.',
      'jsonld.CyclicalContext',
      {code: 'cyclic IRI mapping', context: localCtx, term});
  }

  // now defining term
  defined[term] = false;

  if(api.isKeyword(term)) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; keywords cannot be overridden.',
      'jsonld.SyntaxError',
      {code: 'keyword redefinition', context: localCtx, term});
  }

  if(term === '') {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; a term cannot be an empty string.',
      'jsonld.SyntaxError',
      {code: 'invalid term definition', context: localCtx});
  }

  if(activeCtx.protected[term]) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; tried to redefine a protected term.',
      'jsonld.SyntaxError',
      {code: 'protected term redefinition', context: localCtx, term});
  }

  // remove old mapping
  if(activeCtx.mappings[term]) {
    delete activeCtx.mappings[term];
  }

  // get context term value
  let value = localCtx[term];

  // clear context entry
  if(value === null || (_isObject(value) && value['@id'] === null)) {
    activeCtx.mappings[term] = null;
    defined[term] = true;
    return;
  }

  // convert short-hand value to object w/@id
  let simpleTerm = false;
  if(_isString(value)) {
    simpleTerm = true;
    value = {'@id': value};
  }

  if(!_isObject(value)) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; @context term values must be ' +
      'strings or objects.',
      'jsonld.SyntaxError',
      {code: 'invalid term definition', context: localCtx});
  }

  // create new mapping
  const mapping = activeCtx.mappings[term] = {};
  mapping.reverse = false;

  // make sure term definition only has expected keywords
  const validKeys = ['@container', '@id', '@language', '@reverse', '@type'];

  // JSON-LD 1.1 support
  if(api.processingMode(activeCtx, 1.1)) {
    validKeys.push('@context', '@nest', '@prefix', '@protected');
  }

  for(const kw in value) {
    if(!validKeys.includes(kw)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; a term definition must not contain ' + kw,
        'jsonld.SyntaxError',
        {code: 'invalid term definition', context: localCtx});
    }
  }

  // always compute whether term has a colon as an optimization for
  // _compactIri
  const colon = term.indexOf(':');
  mapping._termHasColon = (colon !== -1);

  if('@reverse' in value) {
    if('@id' in value) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; a @reverse term definition must not ' +
        'contain @id.', 'jsonld.SyntaxError',
        {code: 'invalid reverse property', context: localCtx});
    }
    if('@nest' in value) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; a @reverse term definition must not ' +
        'contain @nest.', 'jsonld.SyntaxError',
        {code: 'invalid reverse property', context: localCtx});
    }
    const reverse = value['@reverse'];
    if(!_isString(reverse)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; a @context @reverse value must be a string.',
        'jsonld.SyntaxError', {code: 'invalid IRI mapping', context: localCtx});
    }

    // expand and add @id mapping
    const id = api.expandIri(
      activeCtx, reverse, {vocab: true, base: false}, localCtx, defined);
    if(!_isAbsoluteIri(id)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; a @context @reverse value must be an ' +
        'absolute IRI or a blank node identifier.',
        'jsonld.SyntaxError', {code: 'invalid IRI mapping', context: localCtx});
    }
    mapping['@id'] = id;
    mapping.reverse = true;
  } else if('@id' in value) {
    let id = value['@id'];
    if(!_isString(id)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; a @context @id value must be an array ' +
        'of strings or a string.',
        'jsonld.SyntaxError', {code: 'invalid IRI mapping', context: localCtx});
    }
    if(id !== term) {
      // expand and add @id mapping
      id = api.expandIri(
        activeCtx, id, {vocab: true, base: false}, localCtx, defined);
      if(!_isAbsoluteIri(id) && !api.isKeyword(id)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; a @context @id value must be an ' +
          'absolute IRI, a blank node identifier, or a keyword.',
          'jsonld.SyntaxError',
          {code: 'invalid IRI mapping', context: localCtx});
      }
      mapping['@id'] = id;
      // indicate if this term may be used as a compact IRI prefix
      mapping._prefix = (!mapping._termHasColon &&
        id.match(/[:\/\?#\[\]@]$/) &&
        (simpleTerm || api.processingMode(activeCtx, 1.0)));
    }
  }

  if(!('@id' in mapping)) {
    // see if the term has a prefix
    if(mapping._termHasColon) {
      const prefix = term.substr(0, colon);
      if(prefix in localCtx) {
        // define parent prefix
        api.createTermDefinition(activeCtx, localCtx, prefix, defined);
      }

      if(activeCtx.mappings[prefix]) {
        // set @id based on prefix parent
        const suffix = term.substr(colon + 1);
        mapping['@id'] = activeCtx.mappings[prefix]['@id'] + suffix;
      } else {
        // term is an absolute IRI
        mapping['@id'] = term;
      }
    } else {
      // non-IRIs *must* define @ids if @vocab is not available
      if(!('@vocab' in activeCtx)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; @context terms must define an @id.',
          'jsonld.SyntaxError',
          {code: 'invalid IRI mapping', context: localCtx, term});
      }
      // prepend vocab to term
      mapping['@id'] = activeCtx['@vocab'] + term;
    }
  }

  // Handle term protection
  if('@protected' in value) {
    if(value['@protected']) {
      activeCtx.protected[term] = true;
    }
  } else if('@protected' in defined) {
    if(defined['@protected']) {
      activeCtx.protected[term] = true;
    }
  }

  // IRI mapping now defined
  defined[term] = true;

  if('@type' in value) {
    let type = value['@type'];
    if(!_isString(type)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; an @context @type values must be a string.',
        'jsonld.SyntaxError',
        {code: 'invalid type mapping', context: localCtx});
    }

    if(type !== '@id' && type !== '@vocab') {
      // expand @type to full IRI
      type = api.expandIri(
        activeCtx, type, {vocab: true, base: false}, localCtx, defined);
      if(!_isAbsoluteIri(type)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; an @context @type value must be an ' +
          'absolute IRI.',
          'jsonld.SyntaxError',
          {code: 'invalid type mapping', context: localCtx});
      }
      if(type.indexOf('_:') === 0) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; an @context @type values must be an IRI, ' +
          'not a blank node identifier.',
          'jsonld.SyntaxError',
          {code: 'invalid type mapping', context: localCtx});
      }
    }

    // add @type to mapping
    mapping['@type'] = type;
  }

  if('@container' in value) {
    // normalize container to an array form
    const container = _isString(value['@container']) ?
      [value['@container']] : (value['@container'] || []);
    const validContainers = ['@list', '@set', '@index', '@language'];
    let isValid = true;
    const hasSet = container.includes('@set');

    // JSON-LD 1.1 support
    if(api.processingMode(activeCtx, 1.1)) {
      validContainers.push('@graph', '@id', '@type');

      // check container length
      if(container.includes('@list')) {
        if(container.length !== 1) {
          throw new JsonLdError(
            'Invalid JSON-LD syntax; @context @container with @list must ' +
            'have no other values',
            'jsonld.SyntaxError',
            {code: 'invalid container mapping', context: localCtx});
        }
      } else if(container.includes('@graph')) {
        if(container.some(key =>
          key !== '@graph' && key !== '@id' && key !== '@index' &&
          key !== '@set')) {
          throw new JsonLdError(
            'Invalid JSON-LD syntax; @context @container with @graph must ' +
            'have no other values other than @id, @index, and @set',
            'jsonld.SyntaxError',
            {code: 'invalid container mapping', context: localCtx});
        }
      } else {
        // otherwise, container may also include @set
        isValid &= container.length <= (hasSet ? 2 : 1);
      }
    } else {
      // in JSON-LD 1.0, container must not be an array (it must be a string,
      // which is one of the validContainers)
      isValid &= !_isArray(value['@container']);

      // check container length
      isValid &= container.length <= 1;
    }

    // check against valid containers
    isValid &= container.every(c => validContainers.includes(c));

    // @set not allowed with @list
    isValid &= !(hasSet && container.includes('@list'));

    if(!isValid) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context @container value must be ' +
        'one of the following: ' + validContainers.join(', '),
        'jsonld.SyntaxError',
        {code: 'invalid container mapping', context: localCtx});
    }

    if(mapping.reverse &&
      !container.every(c => ['@index', '@set'].includes(c))) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context @container value for a @reverse ' +
        'type definition must be @index or @set.', 'jsonld.SyntaxError',
        {code: 'invalid reverse property', context: localCtx});
    }

    // add @container to mapping
    mapping['@container'] = container;
  }

  // scoped contexts
  if('@context' in value) {
    mapping['@context'] = value['@context'];
  }

  if('@language' in value && !('@type' in value)) {
    let language = value['@language'];
    if(language !== null && !_isString(language)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context @language value must be ' +
        'a string or null.', 'jsonld.SyntaxError',
        {code: 'invalid language mapping', context: localCtx});
    }

    // add @language to mapping
    if(language !== null) {
      language = language.toLowerCase();
    }
    mapping['@language'] = language;
  }

  // term may be used as a prefix
  if('@prefix' in value) {
    if(mapping._termHasColon) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context @prefix used on a compact IRI term',
        'jsonld.SyntaxError',
        {code: 'invalid term definition', context: localCtx});
    }
    if(typeof value['@prefix'] === 'boolean') {
      mapping._prefix = value['@prefix'] === true;
    } else {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context value for @prefix must be boolean',
        'jsonld.SyntaxError',
        {code: 'invalid @prefix value', context: localCtx});
    }
  }

  if('@nest' in value) {
    const nest = value['@nest'];
    if(!_isString(nest) || (nest !== '@nest' && nest.indexOf('@') === 0)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context @nest value must be ' +
        'a string which is not a keyword other than @nest.',
        'jsonld.SyntaxError',
        {code: 'invalid @nest value', context: localCtx});
    }
    mapping['@nest'] = nest;
  }

  // disallow aliasing @context and @preserve
  const id = mapping['@id'];
  if(id === '@context' || id === '@preserve') {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; @context and @preserve cannot be aliased.',
      'jsonld.SyntaxError', {code: 'invalid keyword alias', context: localCtx});
  }
};

/**
 * Expands a string to a full IRI. The string may be a term, a prefix, a
 * relative IRI, or an absolute IRI. The associated absolute IRI will be
 * returned.
 *
 * @param activeCtx the current active context.
 * @param value the string to expand.
 * @param relativeTo options for how to resolve relative IRIs:
 *          base: true to resolve against the base IRI, false not to.
 *          vocab: true to concatenate after @vocab, false not to.
 * @param localCtx the local context being processed (only given if called
 *          during context processing).
 * @param defined a map for tracking cycles in context definitions (only given
 *          if called during context processing).
 *
 * @return the expanded value.
 */
api.expandIri = (activeCtx, value, relativeTo, localCtx, defined) => {
  // already expanded
  if(value === null || !_isString(value) || api.isKeyword(value)) {
    return value;
  }

  // define term dependency if not defined
  if(localCtx && value in localCtx && defined[value] !== true) {
    api.createTermDefinition(activeCtx, localCtx, value, defined);
  }

  relativeTo = relativeTo || {};
  if(relativeTo.vocab) {
    const mapping = activeCtx.mappings[value];

    // value is explicitly ignored with a null mapping
    if(mapping === null) {
      return null;
    }

    if(mapping) {
      // value is a term
      return mapping['@id'];
    }
  }

  // split value into prefix:suffix
  const colon = value.indexOf(':');
  if(colon !== -1) {
    const prefix = value.substr(0, colon);
    const suffix = value.substr(colon + 1);

    // do not expand blank nodes (prefix of '_') or already-absolute
    // IRIs (suffix of '//')
    if(prefix === '_' || suffix.indexOf('//') === 0) {
      return value;
    }

    // prefix dependency not defined, define it
    if(localCtx && prefix in localCtx) {
      api.createTermDefinition(activeCtx, localCtx, prefix, defined);
    }

    // use mapping if prefix is defined
    const mapping = activeCtx.mappings[prefix];
    if(mapping) {
      return mapping['@id'] + suffix;
    }

    // already absolute IRI
    return value;
  }

  // prepend vocab
  if(relativeTo.vocab && '@vocab' in activeCtx) {
    return activeCtx['@vocab'] + value;
  }

  // prepend base
  if(relativeTo.base) {
    return prependBase(activeCtx['@base'], value);
  }

  return value;
};

/**
 * Gets the initial context.
 *
 * @param options the options to use:
 *          [base] the document base IRI.
 *
 * @return the initial context.
 */
api.getInitialContext = options => {
  const base = parseUrl(options.base || '');
  const key = JSON.stringify({base, processingMode: options.processingMode});
  const cached = INITIAL_CONTEXT_CACHE.get(key);
  if(cached) {
    return cached;
  }

  const initialContext = {
    '@base': base,
    processingMode: options.processingMode,
    mappings: {},
    inverse: null,
    getInverse: _createInverseContext,
    clone: _cloneActiveContext,
    protected: {}
  };
  // TODO: consider using LRU cache instead
  if(INITIAL_CONTEXT_CACHE.size === INITIAL_CONTEXT_CACHE_MAX_SIZE) {
    // clear whole cache -- assumes scenario where the cache fills means
    // the cache isn't being used very efficiently anyway
    INITIAL_CONTEXT_CACHE.clear();
  }
  INITIAL_CONTEXT_CACHE.set(key, initialContext);
  return initialContext;

  /**
   * Generates an inverse context for use in the compaction algorithm, if
   * not already generated for the given active context.
   *
   * @return the inverse context.
   */
  function _createInverseContext() {
    const activeCtx = this;

    // lazily create inverse
    if(activeCtx.inverse) {
      return activeCtx.inverse;
    }
    const inverse = activeCtx.inverse = {};

    // variables for building fast CURIE map
    const fastCurieMap = activeCtx.fastCurieMap = {};
    const irisToTerms = {};

    // handle default language
    const defaultLanguage = activeCtx['@language'] || '@none';

    // create term selections for each mapping in the context, ordered by
    // shortest and then lexicographically least
    const mappings = activeCtx.mappings;
    const terms = Object.keys(mappings).sort(_compareShortestLeast);
    for(let i = 0; i < terms.length; ++i) {
      const term = terms[i];
      const mapping = mappings[term];
      if(mapping === null) {
        continue;
      }

      let container = mapping['@container'] || '@none';
      container = [].concat(container).sort().join('');

      // iterate over every IRI in the mapping
      const ids = _asArray(mapping['@id']);
      for(let ii = 0; ii < ids.length; ++ii) {
        const iri = ids[ii];
        let entry = inverse[iri];
        const isKeyword = api.isKeyword(iri);

        if(!entry) {
          // initialize entry
          inverse[iri] = entry = {};

          if(!isKeyword && !mapping._termHasColon) {
            // init IRI to term map and fast CURIE prefixes
            irisToTerms[iri] = [term];
            const fastCurieEntry = {iri, terms: irisToTerms[iri]};
            if(iri[0] in fastCurieMap) {
              fastCurieMap[iri[0]].push(fastCurieEntry);
            } else {
              fastCurieMap[iri[0]] = [fastCurieEntry];
            }
          }
        } else if(!isKeyword && !mapping._termHasColon) {
          // add IRI to term match
          irisToTerms[iri].push(term);
        }

        // add new entry
        if(!entry[container]) {
          entry[container] = {
            '@language': {},
            '@type': {},
            '@any': {}
          };
        }
        entry = entry[container];
        _addPreferredTerm(term, entry['@any'], '@none');

        if(mapping.reverse) {
          // term is preferred for values using @reverse
          _addPreferredTerm(term, entry['@type'], '@reverse');
        } else if('@type' in mapping) {
          // term is preferred for values using specific type
          _addPreferredTerm(term, entry['@type'], mapping['@type']);
        } else if('@language' in mapping) {
          // term is preferred for values using specific language
          const language = mapping['@language'] || '@null';
          _addPreferredTerm(term, entry['@language'], language);
        } else {
          // term is preferred for values w/default language or no type and
          // no language
          // add an entry for the default language
          _addPreferredTerm(term, entry['@language'], defaultLanguage);

          // add entries for no type and no language
          _addPreferredTerm(term, entry['@type'], '@none');
          _addPreferredTerm(term, entry['@language'], '@none');
        }
      }
    }

    // build fast CURIE map
    for(const key in fastCurieMap) {
      _buildIriMap(fastCurieMap, key, 1);
    }

    return inverse;
  }

  /**
   * Runs a recursive algorithm to build a lookup map for quickly finding
   * potential CURIEs.
   *
   * @param iriMap the map to build.
   * @param key the current key in the map to work on.
   * @param idx the index into the IRI to compare.
   */
  function _buildIriMap(iriMap, key, idx) {
    const entries = iriMap[key];
    const next = iriMap[key] = {};

    let iri;
    let letter;
    for(let i = 0; i < entries.length; ++i) {
      iri = entries[i].iri;
      if(idx >= iri.length) {
        letter = '';
      } else {
        letter = iri[idx];
      }
      if(letter in next) {
        next[letter].push(entries[i]);
      } else {
        next[letter] = [entries[i]];
      }
    }

    for(const key in next) {
      if(key === '') {
        continue;
      }
      _buildIriMap(next, key, idx + 1);
    }
  }

  /**
   * Adds the term for the given entry if not already added.
   *
   * @param term the term to add.
   * @param entry the inverse context typeOrLanguage entry to add to.
   * @param typeOrLanguageValue the key in the entry to add to.
   */
  function _addPreferredTerm(term, entry, typeOrLanguageValue) {
    if(!(typeOrLanguageValue in entry)) {
      entry[typeOrLanguageValue] = term;
    }
  }

  /**
   * Clones an active context, creating a child active context.
   *
   * @return a clone (child) of the active context.
   */
  function _cloneActiveContext() {
    const child = {};
    child['@base'] = this['@base'];
    child.mappings = util.clone(this.mappings);
    child.clone = this.clone;
    child.inverse = null;
    child.getInverse = this.getInverse;
    child.protected = util.clone(this.protected);
    if('@language' in this) {
      child['@language'] = this['@language'];
    }
    if('@vocab' in this) {
      child['@vocab'] = this['@vocab'];
    }
    return child;
  }
};

/**
 * Gets the value for the given active context key and type, null if none is
 * set.
 *
 * @param ctx the active context.
 * @param key the context key.
 * @param [type] the type of value to get (eg: '@id', '@type'), if not
 *          specified gets the entire entry for a key, null if not found.
 *
 * @return the value.
 */
api.getContextValue = (ctx, key, type) => {
  // return null for invalid key
  if(key === null) {
    return null;
  }

  // get specific entry information
  if(ctx.mappings[key]) {
    const entry = ctx.mappings[key];

    if(_isUndefined(type)) {
      // return whole entry
      return entry;
    }
    if(type in entry) {
      // return entry value for type
      return entry[type];
    }
  }

  // get default language
  if(type === '@language' && (type in ctx)) {
    return ctx[type];
  }

  return null;
};

/**
 * Retrieves external @context URLs using the given document loader. Every
 * instance of @context in the input that refers to a URL will be replaced
 * with the JSON @context found at that URL.
 *
 * @param input the JSON-LD input with possible contexts.
 * @param options the options to use:
 *          documentLoader(url, [callback(err, remoteDoc)]) the document loader.
 * @param callback(err, input) called once the operation completes.
 */
api.getAllContexts = async (input, options) => {
  return _retrieveContextUrls(input, options);
};

/**
 * Processing Mode check.
 *
 * @param activeCtx the current active context.
 * @param version the string or numeric version to check.
 *
 * @return boolean.
 */
api.processingMode = (activeCtx, version) => {
  if(version.toString() >= '1.1') {
    return activeCtx.processingMode &&
      activeCtx.processingMode >= 'json-ld-' + version.toString();
  } else {
    return !activeCtx.processingMode ||
      activeCtx.processingMode === 'json-ld-1.0';
  }
};

/**
 * Returns whether or not the given value is a keyword.
 *
 * @param v the value to check.
 *
 * @return true if the value is a keyword, false if not.
 */
api.isKeyword = v => {
  if(!_isString(v)) {
    return false;
  }
  switch(v) {
    case '@base':
    case '@container':
    case '@context':
    case '@default':
    case '@embed':
    case '@explicit':
    case '@graph':
    case '@id':
    case '@index':
    case '@language':
    case '@list':
    case '@nest':
    case '@none':
    case '@omitDefault':
    case '@prefix':
    case '@preserve':
    case '@protected':
    case '@requireAll':
    case '@reverse':
    case '@set':
    case '@type':
    case '@value':
    case '@version':
    case '@vocab':
      return true;
  }
  return false;
};

async function _retrieveContextUrls(input, options) {
  const documentLoader = util.normalizeDocumentLoader(options.documentLoader);

  // retrieve all @context URLs in input
  await retrieve(input, new Set(), documentLoader);

  return input;

  // recursive function that will retrieve all @context URLs in documents
  async function retrieve(doc, cycles, documentLoader) {
    if(cycles.size > MAX_CONTEXT_URLS) {
      throw new JsonLdError(
        'Maximum number of @context URLs exceeded.',
        'jsonld.ContextUrlError',
        {code: 'loading remote context failed', max: MAX_CONTEXT_URLS});
    }

    // find all URLs in the given document
    const urls = new Map();
    _findContextUrls(doc, urls, false, options.base);
    if(urls.size === 0) {
      return;
    }

    // queue all unretrieved URLs
    const queue = [...urls.keys()].filter(u => urls.get(u) === false);

    // retrieve URLs in queue
    return Promise.all(queue.map(async url => {
      // check for context URL cycle
      if(cycles.has(url)) {
        throw new JsonLdError(
          'Cyclical @context URLs detected.',
          'jsonld.ContextUrlError',
          {code: 'recursive context inclusion', url});
      }

      const _cycles = new Set(cycles);
      _cycles.add(url);
      let remoteDoc;
      let ctx;

      try {
        remoteDoc = await documentLoader(url);
        ctx = remoteDoc.document || null;
        // parse string context as JSON
        if(_isString(ctx)) {
          ctx = JSON.parse(ctx);
        }
      } catch(e) {
        throw new JsonLdError(
          'Dereferencing a URL did not result in a valid JSON-LD object. ' +
          'Possible causes are an inaccessible URL perhaps due to ' +
          'a same-origin policy (ensure the server uses CORS if you are ' +
          'using client-side JavaScript), too many redirects, a ' +
          'non-JSON response, or more than one HTTP Link Header was ' +
          'provided for a remote context.',
          'jsonld.InvalidUrl',
          {code: 'loading remote context failed', url, cause: e});
      }

      // ensure ctx is an object
      if(!_isObject(ctx)) {
        throw new JsonLdError(
          'Dereferencing a URL did not result in a JSON object. The ' +
          'response was valid JSON, but it was not a JSON object.',
          'jsonld.InvalidUrl',
          {code: 'invalid remote context', url});
      }

      // use empty context if no @context key is present
      if(!('@context' in ctx)) {
        ctx = {'@context': {}};
      } else {
        ctx = {'@context': ctx['@context']};
      }

      // append @context URL to context if given
      if(remoteDoc.contextUrl) {
        if(!_isArray(ctx['@context'])) {
          ctx['@context'] = [ctx['@context']];
        }
        ctx['@context'].push(remoteDoc.contextUrl);
      }

      // recurse
      await retrieve(ctx, _cycles, documentLoader);

      // store retrieved context w/replaced @context URLs
      urls.set(url, ctx['@context']);

      // replace all @context URLs in the document
      _findContextUrls(doc, urls, true, options.base);
    }));
  }
}

/**
 * Finds all @context URLs in the given JSON-LD input.
 *
 * @param input the JSON-LD input.
 * @param urls a map of URLs (url => false/@contexts).
 * @param replace true to replace the URLs in the given input with the
 *           @contexts from the urls map, false not to.
 * @param base the base IRI to use to resolve relative IRIs.
 *
 * @return true if new URLs to retrieve were found, false if not.
 */
function _findContextUrls(input, urls, replace, base) {
  if(_isArray(input)) {
    for(const element of input) {
      _findContextUrls(element, urls, replace, base);
    }
    return;
  }

  if(!_isObject(input)) {
    // no @context URLs can be found in non-object input
    return;
  }

  // input is an object
  for(const key in input) {
    if(key !== '@context') {
      _findContextUrls(input[key], urls, replace, base);
      continue;
    }

    // get @context
    const ctx = input[key];

    if(_isArray(ctx)) {
      // array @context
      let length = ctx.length;
      for(let i = 0; i < length; ++i) {
        const _ctx = ctx[i];
        if(_isString(_ctx)) {
          const prepended = prependBase(base, _ctx);
          const resolved = urls.get(prepended);
          // replace w/@context if requested
          if(replace) {
            if(_isArray(resolved)) {
              // add flattened context
              Array.prototype.splice.apply(ctx, [i, 1].concat(resolved));
              i += resolved.length - 1;
              length = ctx.length;
            } else if(resolved !== false) {
              ctx[i] = resolved;
            }
          } else if(resolved === undefined) {
            // @context URL found
            urls.set(prepended, false);
          }
        } else {
          // look for scoped context
          for(const key in _ctx) {
            if(_isObject(_ctx[key])) {
              _findContextUrls(_ctx[key], urls, replace, base);
            }
          }
        }
      }
    } else if(_isString(ctx)) {
      // string @context
      const prepended = prependBase(base, ctx);
      const resolved = urls.get(prepended);
      // replace w/@context if requested
      if(replace) {
        if(resolved !== false) {
          input[key] = resolved;
        }
      } else if(resolved === undefined) {
        // @context URL found
        urls.set(prepended, false);
      }
    } else {
      // look for scoped context
      for(const key in ctx) {
        if(_isObject(ctx[key])) {
          _findContextUrls(ctx[key], urls, replace, base);
        }
      }
    }
  }
}
