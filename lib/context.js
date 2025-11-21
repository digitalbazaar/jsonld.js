/*
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const util = require('./util');
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
  prependBase
} = require('./url');

const {
  handleEvent: _handleEvent
} = require('./events');

const {
  REGEX_BCP47,
  REGEX_KEYWORD,
  asArray: _asArray,
  compareShortestLeast: _compareShortestLeast
} = require('./util');

const INITIAL_CONTEXT_CACHE = new Map();
const INITIAL_CONTEXT_CACHE_MAX_SIZE = 10000;

const api = {};
module.exports = api;

/**
 * Processes a local context and returns a new active context.
 *
 * @param activeCtx the current active context.
 * @param localCtx the local context to process.
 * @param options the context processing options.
 * @param propagate `true` if `false`, retains any previously defined term,
 *   which can be rolled back when the descending into a new node object.
 * @param overrideProtected `false` allows protected terms to be modified.
 *
 * @return a Promise that resolves to the new active context.
 */
api.process = async ({
  activeCtx, localCtx, options,
  propagate = true,
  overrideProtected = false,
  cycles = new Set()
}) => {
  // normalize local context to an array of @context objects
  if(_isObject(localCtx) && '@context' in localCtx &&
    _isArray(localCtx['@context'])) {
    localCtx = localCtx['@context'];
  }
  const ctxs = _asArray(localCtx);

  // no contexts in array, return current active context w/o changes
  if(ctxs.length === 0) {
    return activeCtx;
  }

  // event handler for capturing events to replay when using a cached context
  const events = [];
  const eventCaptureHandler = [
    ({event, next}) => {
      events.push(event);
      next();
    }
  ];
  // chain to original handler
  if(options.eventHandler) {
    eventCaptureHandler.push(options.eventHandler);
  }
  // store original options to use when replaying events
  const originalOptions = options;
  // shallow clone options with event capture handler
  options = {...options, eventHandler: eventCaptureHandler};

  // resolve contexts
  const resolved = await options.contextResolver.resolve({
    activeCtx,
    context: localCtx,
    documentLoader: options.documentLoader,
    base: options.base
  });

  // override propagate if first resolved context has `@propagate`
  if(_isObject(resolved[0].document) &&
    typeof resolved[0].document['@propagate'] === 'boolean') {
    // retrieve early, error checking done later
    propagate = resolved[0].document['@propagate'];
  }

  // process each context in order, update active context
  // on each iteration to ensure proper caching
  let rval = activeCtx;

  // track the previous context
  // if not propagating, make sure rval has a previous context
  if(!propagate && !rval.previousContext) {
    // clone `rval` context before updating
    rval = rval.clone();
    rval.previousContext = activeCtx;
  }

  for(const resolvedContext of resolved) {
    let {document: ctx} = resolvedContext;

    // update active context to one computed from last iteration
    activeCtx = rval;

    // reset to initial context
    if(ctx === null) {
      // We can't nullify if there are protected terms and we're
      // not allowing overrides (e.g. processing a property term scoped context)
      if(!overrideProtected && Object.keys(activeCtx.protected).length !== 0) {
        throw new JsonLdError(
          'Tried to nullify a context with protected terms outside of ' +
          'a term definition.',
          'jsonld.SyntaxError',
          {code: 'invalid context nullification'});
      }
      rval = activeCtx = api.getInitialContext(options).clone();
      continue;
    }

    // get processed context from cache if available
    const processed = resolvedContext.getProcessed(activeCtx);
    if(processed) {
      if(originalOptions.eventHandler) {
        // replay events with original non-capturing options
        for(const event of processed.events) {
          _handleEvent({event, options: originalOptions});
        }
      }

      rval = activeCtx = processed.context;
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

    // TODO: there is likely a `previousContext` cloning optimization that
    // could be applied here (no need to copy it under certain conditions)

    // clone context before updating it
    rval = rval.clone();

    // define context mappings for keys in local context
    const defined = new Map();

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
      defined.set('@version', true);
    }

    // if not set explicitly, set processingMode to "json-ld-1.1"
    rval.processingMode =
      rval.processingMode || activeCtx.processingMode;

    // handle @base
    if('@base' in ctx) {
      let base = ctx['@base'];

      if(base === null || _isAbsoluteIri(base)) {
        // no action
      } else if(_isRelativeIri(base)) {
        base = prependBase(rval['@base'], base);
      } else {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; the value of "@base" in a ' +
          '@context must be an absolute IRI, a relative IRI, or null.',
          'jsonld.SyntaxError', {code: 'invalid base IRI', context: ctx});
      }

      rval['@base'] = base;
      defined.set('@base', true);
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
      } else if(!_isAbsoluteIri(value) && api.processingMode(rval, 1.0)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; the value of "@vocab" in a ' +
          '@context must be an absolute IRI.',
          'jsonld.SyntaxError', {code: 'invalid vocab mapping', context: ctx});
      } else {
        const vocab = _expandIri(rval, value, {vocab: true, base: true},
          undefined, undefined, options);
        if(!_isAbsoluteIri(vocab)) {
          if(options.eventHandler) {
            _handleEvent({
              event: {
                type: ['JsonLdEvent'],
                code: 'relative @vocab reference',
                level: 'warning',
                message: 'Relative @vocab reference found.',
                details: {
                  vocab
                }
              },
              options
            });
          }
        }
        rval['@vocab'] = vocab;
      }
      defined.set('@vocab', true);
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
        if(!value.match(REGEX_BCP47)) {
          if(options.eventHandler) {
            _handleEvent({
              event: {
                type: ['JsonLdEvent'],
                code: 'invalid @language value',
                level: 'warning',
                message: '@language value must be valid BCP47.',
                details: {
                  language: value
                }
              },
              options
            });
          }
        }
        rval['@language'] = value.toLowerCase();
      }
      defined.set('@language', true);
    }

    // handle @direction
    if('@direction' in ctx) {
      const value = ctx['@direction'];
      if(activeCtx.processingMode === 'json-ld-1.0') {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; @direction not compatible with ' +
          activeCtx.processingMode,
          'jsonld.SyntaxError',
          {code: 'invalid context member', context: ctx});
      }
      if(value === null) {
        delete rval['@direction'];
      } else if(value !== 'ltr' && value !== 'rtl') {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; the value of "@direction" in a ' +
          '@context must be null, "ltr", or "rtl".',
          'jsonld.SyntaxError',
          {code: 'invalid base direction', context: ctx});
      } else {
        rval['@direction'] = value;
      }
      defined.set('@direction', true);
    }

    // handle @propagate
    // note: we've already extracted it, here we just do error checking
    if('@propagate' in ctx) {
      const value = ctx['@propagate'];
      if(activeCtx.processingMode === 'json-ld-1.0') {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; @propagate not compatible with ' +
          activeCtx.processingMode,
          'jsonld.SyntaxError',
          {code: 'invalid context entry', context: ctx});
      }
      if(typeof value !== 'boolean') {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; @propagate value must be a boolean.',
          'jsonld.SyntaxError',
          {code: 'invalid @propagate value', context: localCtx});
      }
      defined.set('@propagate', true);
    }

    // handle @import
    if('@import' in ctx) {
      const value = ctx['@import'];
      if(activeCtx.processingMode === 'json-ld-1.0') {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; @import not compatible with ' +
          activeCtx.processingMode,
          'jsonld.SyntaxError',
          {code: 'invalid context entry', context: ctx});
      }
      if(!_isString(value)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; @import must be a string.',
          'jsonld.SyntaxError',
          {code: 'invalid @import value', context: localCtx});
      }

      // resolve contexts
      const resolvedImport = await options.contextResolver.resolve({
        activeCtx,
        context: value,
        documentLoader: options.documentLoader,
        base: options.base
      });
      if(resolvedImport.length !== 1) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; @import must reference a single context.',
          'jsonld.SyntaxError',
          {code: 'invalid remote context', context: localCtx});
      }
      const processedImport = resolvedImport[0].getProcessed(activeCtx);
      if(processedImport) {
        // Note: if the same context were used in this active context
        // as a reference context, then processed_input might not
        // be a dict.
        ctx = processedImport;
      } else {
        const importCtx = resolvedImport[0].document;
        if('@import' in importCtx) {
          throw new JsonLdError(
            'Invalid JSON-LD syntax: ' +
            'imported context must not include @import.',
            'jsonld.SyntaxError',
            {code: 'invalid context entry', context: localCtx});
        }

        // merge ctx into importCtx and replace rval with the result
        for(const key in importCtx) {
          if(!ctx.hasOwnProperty(key)) {
            ctx[key] = importCtx[key];
          }
        }

        // Note: this could potentially conflict if the import
        // were used in the same active context as a referenced
        // context and an import. In this case, we
        // could override the cached result, but seems unlikely.
        resolvedImport[0].setProcessed(activeCtx, ctx);
      }

      defined.set('@import', true);
    }

    // handle @protected; determine whether this sub-context is declaring
    // all its terms to be "protected" (exceptions can be made on a
    // per-definition basis)
    defined.set('@protected', ctx['@protected'] || false);

    // process all other keys
    for(const key in ctx) {
      api.createTermDefinition({
        activeCtx: rval,
        localCtx: ctx,
        term: key,
        defined,
        options,
        overrideProtected
      });

      if(_isObject(ctx[key]) && '@context' in ctx[key]) {
        const keyCtx = ctx[key]['@context'];
        let process = true;
        if(_isString(keyCtx)) {
          const url = prependBase(options.base, keyCtx);
          // track processed contexts to avoid scoped context recursion
          if(cycles.has(url)) {
            process = false;
          } else {
            cycles.add(url);
          }
        }
        // parse context to validate
        if(process) {
          try {
            await api.process({
              activeCtx: rval.clone(),
              localCtx: ctx[key]['@context'],
              overrideProtected: true,
              options,
              cycles
            });
          } catch(e) {
            throw new JsonLdError(
              'Invalid JSON-LD syntax; invalid scoped context.',
              'jsonld.SyntaxError',
              {
                code: 'invalid scoped context',
                context: ctx[key]['@context'],
                term: key
              });
          }
        }
      }
    }

    // cache processed result
    resolvedContext.setProcessed(activeCtx, {
      context: rval,
      events
    });
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
 * @param {Object} [options] - creation options.
 * @param overrideProtected `false` allows protected terms to be modified.
 */
api.createTermDefinition = ({
  activeCtx,
  localCtx,
  term,
  defined,
  options,
  overrideProtected = false,
}) => {
  if(defined.has(term)) {
    // term already defined
    if(defined.get(term)) {
      return;
    }
    // cycle detected
    throw new JsonLdError(
      'Cyclical context definition detected.',
      'jsonld.CyclicalContext',
      {code: 'cyclic IRI mapping', context: localCtx, term});
  }

  // now defining term
  defined.set(term, false);

  // get context term value
  let value;
  if(localCtx.hasOwnProperty(term)) {
    value = localCtx[term];
  }

  if(term === '@type' &&
     _isObject(value) &&
     (value['@container'] || '@set') === '@set' &&
     api.processingMode(activeCtx, 1.1)) {

    const validKeys = ['@container', '@id', '@protected'];
    const keys = Object.keys(value);
    if(keys.length === 0 || keys.some(k => !validKeys.includes(k))) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; keywords cannot be overridden.',
        'jsonld.SyntaxError',
        {code: 'keyword redefinition', context: localCtx, term});
    }
  } else if(api.isKeyword(term)) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; keywords cannot be overridden.',
      'jsonld.SyntaxError',
      {code: 'keyword redefinition', context: localCtx, term});
  } else if(term.match(REGEX_KEYWORD)) {
    if(options.eventHandler) {
      _handleEvent({
        event: {
          type: ['JsonLdEvent'],
          code: 'reserved term',
          level: 'warning',
          message:
            'Terms beginning with "@" are ' +
            'reserved for future use and dropped.',
          details: {
            term
          }
        },
        options
      });
    }
    return;
  } else if(term === '') {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; a term cannot be an empty string.',
      'jsonld.SyntaxError',
      {code: 'invalid term definition', context: localCtx});
  }

  // keep reference to previous mapping for potential `@protected` check
  const previousMapping = activeCtx.mappings.get(term);

  // remove old mapping
  if(activeCtx.mappings.has(term)) {
    activeCtx.mappings.delete(term);
  }

  // convert short-hand value to object w/@id
  let simpleTerm = false;
  if(_isString(value) || value === null) {
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
  const mapping = {};
  activeCtx.mappings.set(term, mapping);
  mapping.reverse = false;

  // make sure term definition only has expected keywords
  const validKeys = ['@container', '@id', '@language', '@reverse', '@type'];

  // JSON-LD 1.1 support
  if(api.processingMode(activeCtx, 1.1)) {
    validKeys.push(
      '@context', '@direction', '@index', '@nest', '@prefix', '@protected');
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
  mapping._termHasColon = (colon > 0);

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

    if(reverse.match(REGEX_KEYWORD)) {
      if(options.eventHandler) {
        _handleEvent({
          event: {
            type: ['JsonLdEvent'],
            code: 'reserved @reverse value',
            level: 'warning',
            message:
              '@reverse values beginning with "@" are ' +
              'reserved for future use and dropped.',
            details: {
              reverse
            }
          },
          options
        });
      }
      if(previousMapping) {
        activeCtx.mappings.set(term, previousMapping);
      } else {
        activeCtx.mappings.delete(term);
      }
      return;
    }

    // expand and add @id mapping
    const id = _expandIri(
      activeCtx, reverse, {vocab: true, base: false}, localCtx, defined,
      options);
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
    if(id && !_isString(id)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; a @context @id value must be an array ' +
        'of strings or a string.',
        'jsonld.SyntaxError', {code: 'invalid IRI mapping', context: localCtx});
    }
    if(id === null) {
      // reserve a null term, which may be protected
      mapping['@id'] = null;
    } else if(!api.isKeyword(id) && id.match(REGEX_KEYWORD)) {
      if(options.eventHandler) {
        _handleEvent({
          event: {
            type: ['JsonLdEvent'],
            code: 'reserved @id value',
            level: 'warning',
            message:
              '@id values beginning with "@" are ' +
              'reserved for future use and dropped.',
            details: {
              id
            }
          },
          options
        });
      }
      if(previousMapping) {
        activeCtx.mappings.set(term, previousMapping);
      } else {
        activeCtx.mappings.delete(term);
      }
      return;
    } else if(id !== term) {
      // expand and add @id mapping
      id = _expandIri(
        activeCtx, id, {vocab: true, base: false}, localCtx, defined, options);
      if(!_isAbsoluteIri(id) && !api.isKeyword(id)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; a @context @id value must be an ' +
          'absolute IRI, a blank node identifier, or a keyword.',
          'jsonld.SyntaxError',
          {code: 'invalid IRI mapping', context: localCtx});
      }

      // if term has the form of an IRI it must map the same
      if(term.match(/(?::[^:])|\//)) {
        const termDefined = new Map(defined).set(term, true);
        const termIri = _expandIri(
          activeCtx, term, {vocab: true, base: false},
          localCtx, termDefined, options);
        if(termIri !== id) {
          throw new JsonLdError(
            'Invalid JSON-LD syntax; term in form of IRI must ' +
            'expand to definition.',
            'jsonld.SyntaxError',
            {code: 'invalid IRI mapping', context: localCtx});
        }
      }

      mapping['@id'] = id;
      // indicate if this term may be used as a compact IRI prefix
      mapping._prefix = (simpleTerm &&
        !mapping._termHasColon &&
        id.match(/[:\/\?#\[\]@]$/) !== null);
    }
  }

  if(!('@id' in mapping)) {
    // see if the term has a prefix
    if(mapping._termHasColon) {
      const prefix = term.substr(0, colon);
      if(localCtx.hasOwnProperty(prefix)) {
        // define parent prefix
        api.createTermDefinition({
          activeCtx, localCtx, term: prefix, defined, options
        });
      }

      if(activeCtx.mappings.has(prefix)) {
        // set @id based on prefix parent
        const suffix = term.substr(colon + 1);
        mapping['@id'] = activeCtx.mappings.get(prefix)['@id'] + suffix;
      } else {
        // term is an absolute IRI
        mapping['@id'] = term;
      }
    } else if(term === '@type') {
      // Special case, were we've previously determined that container is @set
      mapping['@id'] = term;
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
  if(value['@protected'] === true ||
    (defined.get('@protected') === true && value['@protected'] !== false)) {
    activeCtx.protected[term] = true;
    mapping.protected = true;
  }

  // IRI mapping now defined
  defined.set(term, true);

  if('@type' in value) {
    let type = value['@type'];
    if(!_isString(type)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; an @context @type value must be a string.',
        'jsonld.SyntaxError',
        {code: 'invalid type mapping', context: localCtx});
    }

    if((type === '@json' || type === '@none')) {
      if(api.processingMode(activeCtx, 1.0)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; an @context @type value must not be ' +
          `"${type}" in JSON-LD 1.0 mode.`,
          'jsonld.SyntaxError',
          {code: 'invalid type mapping', context: localCtx});
      }
    } else if(type !== '@id' && type !== '@vocab') {
      // expand @type to full IRI
      type = _expandIri(
        activeCtx, type, {vocab: true, base: false}, localCtx, defined,
        options);
      if(!_isAbsoluteIri(type)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; an @context @type value must be an ' +
          'absolute IRI.',
          'jsonld.SyntaxError',
          {code: 'invalid type mapping', context: localCtx});
      }
      if(type.indexOf('_:') === 0) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; an @context @type value must be an IRI, ' +
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

      if(container.includes('@type')) {
        // If mapping does not have an @type,
        // set it to @id
        mapping['@type'] = mapping['@type'] || '@id';

        // type mapping must be either @id or @vocab
        if(!['@id', '@vocab'].includes(mapping['@type'])) {
          throw new JsonLdError(
            'Invalid JSON-LD syntax; container: @type requires @type to be ' +
            '@id or @vocab.',
            'jsonld.SyntaxError',
            {code: 'invalid type mapping', context: localCtx});
        }
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

  // property indexing
  if('@index' in value) {
    if(!('@container' in value) || !mapping['@container'].includes('@index')) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @index without @index in @container: ' +
        `"${value['@index']}" on term "${term}".`, 'jsonld.SyntaxError',
        {code: 'invalid term definition', context: localCtx});
    }
    if(!_isString(value['@index']) || value['@index'].indexOf('@') === 0) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @index must expand to an IRI: ' +
        `"${value['@index']}" on term "${term}".`, 'jsonld.SyntaxError',
        {code: 'invalid term definition', context: localCtx});
    }
    mapping['@index'] = value['@index'];
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
    if(term.match(/:|\//)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context @prefix used on a compact IRI term',
        'jsonld.SyntaxError',
        {code: 'invalid term definition', context: localCtx});
    }
    if(api.isKeyword(mapping['@id'])) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; keywords may not be used as prefixes',
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

  if('@direction' in value) {
    const direction = value['@direction'];
    if(direction !== null && direction !== 'ltr' && direction !== 'rtl') {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @direction value must be ' +
        'null, "ltr", or "rtl".',
        'jsonld.SyntaxError',
        {code: 'invalid base direction', context: localCtx});
    }
    mapping['@direction'] = direction;
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

  // Check for overriding protected terms
  if(previousMapping && previousMapping.protected && !overrideProtected) {
    // force new term to continue to be protected and see if the mappings would
    // be equal
    activeCtx.protected[term] = true;
    mapping.protected = true;
    if(!_deepCompare(previousMapping, mapping)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; tried to redefine a protected term.',
        'jsonld.SyntaxError',
        {code: 'protected term redefinition', context: localCtx, term});
    }
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
 * @param {Object} [options] - processing options.
 *
 * @return the expanded value.
 */
api.expandIri = (activeCtx, value, relativeTo, options) => {
  return _expandIri(activeCtx, value, relativeTo, undefined, undefined,
    options);
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
 * @param {Object} [options] - processing options.
 *
 * @return the expanded value.
 */
function _expandIri(activeCtx, value, relativeTo, localCtx, defined, options) {
  // already expanded
  if(value === null || !_isString(value) || api.isKeyword(value)) {
    return value;
  }

  // ignore non-keyword things that look like a keyword
  if(value.match(REGEX_KEYWORD)) {
    return null;
  }

  // define term dependency if not defined
  if(localCtx && localCtx.hasOwnProperty(value) &&
    defined.get(value) !== true) {
    api.createTermDefinition({
      activeCtx, localCtx, term: value, defined, options
    });
  }

  relativeTo = relativeTo || {};
  if(relativeTo.vocab) {
    const mapping = activeCtx.mappings.get(value);

    // value is explicitly ignored with a null mapping
    if(mapping === null) {
      return null;
    }

    if(_isObject(mapping) && '@id' in mapping) {
      // value is a term
      return mapping['@id'];
    }
  }

  // split value into prefix:suffix
  const colon = value.indexOf(':');
  if(colon > 0) {
    const prefix = value.substr(0, colon);
    const suffix = value.substr(colon + 1);

    // do not expand blank nodes (prefix of '_') or already-absolute
    // IRIs (suffix of '//')
    if(prefix === '_' || suffix.indexOf('//') === 0) {
      return value;
    }

    // prefix dependency not defined, define it
    if(localCtx && localCtx.hasOwnProperty(prefix)) {
      api.createTermDefinition({
        activeCtx, localCtx, term: prefix, defined, options
      });
    }

    // use mapping if prefix is defined
    const mapping = activeCtx.mappings.get(prefix);
    if(mapping && mapping._prefix) {
      return mapping['@id'] + suffix;
    }

    // already absolute IRI
    if(_isAbsoluteIri(value)) {
      return value;
    }
  }

  // A flag that captures whether the iri being expanded is
  // the value for an @type
  //let typeExpansion = false;

  //if(options !== undefined && options.typeExpansion !== undefined) {
  //  typeExpansion = options.typeExpansion;
  //}

  if(relativeTo.vocab && '@vocab' in activeCtx) {
    // prepend vocab
    const prependedResult = activeCtx['@vocab'] + value;
    // FIXME: needed? may be better as debug event.
    /*
    if(options && options.eventHandler) {
      _handleEvent({
        event: {
          type: ['JsonLdEvent'],
          code: 'prepending @vocab during expansion',
          level: 'info',
          message: 'Prepending @vocab during expansion.',
          details: {
            type: '@vocab',
            vocab: activeCtx['@vocab'],
            value,
            result: prependedResult,
            typeExpansion
          }
        },
        options
      });
    }
    */
    // the null case preserves value as potentially relative
    value = prependedResult;
  } else if(relativeTo.base) {
    // prepend base
    let prependedResult;
    let base;
    if('@base' in activeCtx) {
      if(activeCtx['@base']) {
        base = prependBase(options.base, activeCtx['@base']);
        prependedResult = prependBase(base, value);
      } else {
        base = activeCtx['@base'];
        prependedResult = value;
      }
    } else {
      base = options.base;
      prependedResult = prependBase(options.base, value);
    }
    // FIXME: needed? may be better as debug event.
    /*
    if(options && options.eventHandler) {
      _handleEvent({
        event: {
          type: ['JsonLdEvent'],
          code: 'prepending @base during expansion',
          level: 'info',
          message: 'Prepending @base during expansion.',
          details: {
            type: '@base',
            base,
            value,
            result: prependedResult,
            typeExpansion
          }
        },
        options
      });
    }
    */
    // the null case preserves value as potentially relative
    value = prependedResult;
  }

  // FIXME: duplicate? needed? maybe just enable in a verbose debug mode
  /*
  if(!_isAbsoluteIri(value) && options && options.eventHandler) {
    // emit event indicating a relative IRI was found, which can result in it
    // being dropped when converting to other RDF representations
    _handleEvent({
      event: {
        type: ['JsonLdEvent'],
        code: 'relative IRI after expansion',
        // FIXME: what level?
        level: 'warning',
        message: 'Relative IRI after expansion.',
        details: {
          relativeIri: value,
          typeExpansion
        }
      },
      options
    });
    // NOTE: relative reference events emitted at calling sites as needed
  }
  */

  return value;
}

/**
 * Gets the initial context.
 *
 * @param options the options to use:
 *          [base] the document base IRI.
 *
 * @return the initial context.
 */
api.getInitialContext = options => {
  const key = JSON.stringify({processingMode: options.processingMode});
  const cached = INITIAL_CONTEXT_CACHE.get(key);
  if(cached) {
    return cached;
  }

  const initialContext = {
    processingMode: options.processingMode,
    mappings: new Map(),
    inverse: null,
    getInverse: _createInverseContext,
    clone: _cloneActiveContext,
    revertToPreviousContext: _revertToPreviousContext,
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
    const defaultLanguage = (activeCtx['@language'] || '@none').toLowerCase();

    // handle default direction
    const defaultDirection = activeCtx['@direction'];

    // create term selections for each mapping in the context, ordered by
    // shortest and then lexicographically least
    const mappings = activeCtx.mappings;
    const terms = [...mappings.keys()].sort(_compareShortestLeast);
    for(const term of terms) {
      const mapping = mappings.get(term);
      if(mapping === null) {
        continue;
      }

      let container = mapping['@container'] || '@none';
      container = [].concat(container).sort().join('');

      if(mapping['@id'] === null) {
        continue;
      }
      // iterate over every IRI in the mapping
      const ids = _asArray(mapping['@id']);
      for(const iri of ids) {
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
        } else if(mapping['@type'] === '@none') {
          _addPreferredTerm(term, entry['@any'], '@none');
          _addPreferredTerm(term, entry['@language'], '@none');
          _addPreferredTerm(term, entry['@type'], '@none');
        } else if('@type' in mapping) {
          // term is preferred for values using specific type
          _addPreferredTerm(term, entry['@type'], mapping['@type']);
        } else if('@language' in mapping && '@direction' in mapping) {
          // term is preferred for values using specific language and direction
          const language = mapping['@language'];
          const direction = mapping['@direction'];
          if(language && direction) {
            _addPreferredTerm(term, entry['@language'],
              `${language}_${direction}`.toLowerCase());
          } else if(language) {
            _addPreferredTerm(term, entry['@language'], language.toLowerCase());
          } else if(direction) {
            _addPreferredTerm(term, entry['@language'], `_${direction}`);
          } else {
            _addPreferredTerm(term, entry['@language'], '@null');
          }
        } else if('@language' in mapping) {
          _addPreferredTerm(term, entry['@language'],
            (mapping['@language'] || '@null').toLowerCase());
        } else if('@direction' in mapping) {
          if(mapping['@direction']) {
            _addPreferredTerm(term, entry['@language'],
              `_${mapping['@direction']}`);
          } else {
            _addPreferredTerm(term, entry['@language'], '@none');
          }
        } else if(defaultDirection) {
          _addPreferredTerm(term, entry['@language'], `_${defaultDirection}`);
          _addPreferredTerm(term, entry['@language'], '@none');
          _addPreferredTerm(term, entry['@type'], '@none');
        } else {
          // add entries for no type and no language
          _addPreferredTerm(term, entry['@language'], defaultLanguage);
          _addPreferredTerm(term, entry['@language'], '@none');
          _addPreferredTerm(term, entry['@type'], '@none');
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
    for(const entry of entries) {
      iri = entry.iri;
      if(idx >= iri.length) {
        letter = '';
      } else {
        letter = iri[idx];
      }
      if(letter in next) {
        next[letter].push(entry);
      } else {
        next[letter] = [entry];
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
    if(!entry.hasOwnProperty(typeOrLanguageValue)) {
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
    child.mappings = util.clone(this.mappings);
    child.clone = this.clone;
    child.inverse = null;
    child.getInverse = this.getInverse;
    child.protected = util.clone(this.protected);
    if(this.previousContext) {
      child.previousContext = this.previousContext.clone();
    }
    child.revertToPreviousContext = this.revertToPreviousContext;
    if('@base' in this) {
      child['@base'] = this['@base'];
    }
    if('@language' in this) {
      child['@language'] = this['@language'];
    }
    if('@vocab' in this) {
      child['@vocab'] = this['@vocab'];
    }
    return child;
  }

  /**
   * Reverts any type-scoped context in this active context to the previous
   * context.
   */
  function _revertToPreviousContext() {
    if(!this.previousContext) {
      return this;
    }
    return this.previousContext.clone();
  }
};

/**
 * Gets the value for the given active context key and type, null if none is
 * set or undefined if none is set and type is '@context'.
 *
 * @param ctx the active context.
 * @param key the context key.
 * @param [type] the type of value to get (eg: '@id', '@type'), if not
 *          specified gets the entire entry for a key, null if not found.
 *
 * @return the value, null, or undefined.
 */
api.getContextValue = (ctx, key, type) => {
  // invalid key
  if(key === null) {
    if(type === '@context') {
      return undefined;
    }
    return null;
  }

  // get specific entry information
  if(ctx.mappings.has(key)) {
    const entry = ctx.mappings.get(key);

    if(_isUndefined(type)) {
      // return whole entry
      return entry;
    }
    if(entry.hasOwnProperty(type)) {
      // return entry value for type
      return entry[type];
    }
  }

  // get default language
  if(type === '@language' && type in ctx) {
    return ctx[type];
  }

  // get default direction
  if(type === '@direction' && type in ctx) {
    return ctx[type];
  }

  if(type === '@context') {
    return undefined;
  }
  return null;
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
    return !activeCtx.processingMode ||
      activeCtx.processingMode >= 'json-ld-' + version.toString();
  } else {
    return activeCtx.processingMode === 'json-ld-1.0';
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
  if(!_isString(v) || v[0] !== '@') {
    return false;
  }
  switch(v) {
    case '@base':
    case '@container':
    case '@context':
    case '@default':
    case '@direction':
    case '@embed':
    case '@explicit':
    case '@graph':
    case '@id':
    case '@included':
    case '@index':
    case '@json':
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

function _deepCompare(x1, x2) {
  // compare `null` or primitive types directly
  if((!(x1 && typeof x1 === 'object')) ||
     (!(x2 && typeof x2 === 'object'))) {
    return x1 === x2;
  }
  // x1 and x2 are objects (also potentially arrays)
  const x1Array = Array.isArray(x1);
  if(x1Array !== Array.isArray(x2)) {
    return false;
  }
  if(x1Array) {
    if(x1.length !== x2.length) {
      return false;
    }
    for(let i = 0; i < x1.length; ++i) {
      if(!_deepCompare(x1[i], x2[i])) {
        return false;
      }
    }
    return true;
  }
  // x1 and x2 are non-array objects
  const k1s = Object.keys(x1);
  const k2s = Object.keys(x2);
  if(k1s.length !== k2s.length) {
    return false;
  }
  for(const k1 in x1) {
    let v1 = x1[k1];
    let v2 = x2[k1];
    // special case: `@container` can be in any order
    if(k1 === '@container') {
      if(Array.isArray(v1) && Array.isArray(v2)) {
        v1 = v1.slice().sort();
        v2 = v2.slice().sort();
      }
    }
    if(!_deepCompare(v1, v2)) {
      return false;
    }
  }
  return true;
}
