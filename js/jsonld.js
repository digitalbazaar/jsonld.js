/**
 * A JavaScript implementation of a JSON-LD Processor.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2011-2012 Digital Bazaar, Inc.
 */
(function() {

// define jsonld API
var jsonld = {};

/* Core API */

/**
 * Performs JSON-LD compaction.
 *
 * @param input the JSON-LD object to compact.
 * @param ctx the context to compact with.
 * @param [optimize] true to optimize the compaction (default: false).
 * @param [resolver(url, callback(err, jsonCtx))] the URL resolver to use.
 * @param callback(err, compacted) called once the operation completes.
 */
jsonld.compact = function(input, ctx) {
  // nothing to compact
  if(input === null) {
    return callback(null, null);
  }

  // get arguments
  var optimize = false;
  var resolver = jsonld.urlResolver;
  var callbackArg = 2;
  if(arguments.length > 4) {
    optimize = arguments[2];
    resolver = arguments[3];
    callbackArg += 2;
  }
  else if(arguments.length > 3) {
    if(_isBoolean(arguments[2])) {
      optimize = arguments[2];
    }
    else {
      resolver = arguments[2];
    }
    callbackArg += 1;
  }
  var callback = arguments[callbackArg];

  // default to empty context if not given
  ctx = ctx || {};

  // expand input then do compaction
  jsonld.expand(input, function(err, expanded) {
    if(err) {
      return callback(new JsonLdError(
        'Could not expand input before compaction.',
        'jsonld.CompactError', {cause: err}));
    }

    // merge and resolve contexts
    jsonld.mergeContexts({}, ctx, function(err, ctx) {
      if(err) {
        return callback(new JsonLdError(
          'Could not merge context before compaction.',
          'jsonld.CompactError', {cause: err}));
      }

      try {
        // create optimize context
        if(optimize) {
          var optimizeCtx = {};
        }

        // do compaction
        input = expanded;
        var compacted = new Processor().compact(ctx, null, input, optimizeCtx);
        cleanup(null, compacted, optimizeCtx);
      }
      catch(ex) {
        callback(ex);
      }
    });
  });

  // performs clean up after compaction
  function cleanup(err, compacted, optimizeCtx) {
    if(err) {
      return callback(err);
    }

    // if compacted is an array with 1 entry, remove array
    if(_isArray(compacted) && compacted.length === 1) {
      compacted = compacted[0];
    }

    // build output context
    ctx = _clone(ctx);
    if(!_isArray(ctx)) {
      ctx = [ctx];
    }
    // add optimize context
    if(optimizeCtx) {
      ctx.push(optimizeCtx);
    }
    // remove empty contexts
    var tmp = ctx;
    ctx = [];
    for(var i in tmp) {
      if(!_isObject(tmp[i]) || Object.keys(tmp[i]).length > 0) {
        ctx[i] = tmp[i];
      }
    }

    // add context
    if(ctx.length > 0) {
      // remove array if only one context
      if(ctx.length === 1) {
        ctx = ctx[0];
      }

      if(_isArray(compacted)) {
        // use '@graph' keyword
        var kwgraph = _getKeywords(ctx)['@graph'];
        var graph = compacted;
        compacted = {'@context': ctx};
        compacted[kwgraph] = graph;
      }
      else if(_isObject(compacted)) {
        // reorder keys so @context is first
        var graph = compacted;
        compacted = {'@context': ctx};
        for(var key in graph) {
          compacted[key] = graph[key];
        }
      }
    }

    callback(null, compacted);
  };
};

/**
 * Performs JSON-LD expansion.
 *
 * @param input the JSON-LD object to expand.
 * @param [resolver(url, callback(err, jsonCtx))] the URL resolver to use.
 * @param callback(err, expanded) called once the operation completes.
 */
jsonld.expand = function(input) {
  // get arguments
  var resolver = jsonld.urlResolver;
  var callback;
  var callbackArg = 1;
  if(arguments.length > 2) {
    resolver = arguments[1];
    callbackArg += 1;
  }
  callback = arguments[callbackArg];

  // resolve all @context URLs in the input
  input = _clone(input);
  _resolveUrls(input, resolver, function(err, input) {
    if(err) {
      return callback(err);
    }
    try {
      // do expansion
      var expanded = new Processor().expand({}, null, input);
      if(!_isArray(expanded)) {
        expanded = [expanded];
      }
      callback(null, expanded);
    }
    catch(ex) {
      callback(ex);
    }
  });
};

/**
 * Performs JSON-LD framing.
 *
 * @param input the JSON-LD object to frame.
 * @param frame the JSON-LD frame to use.
 * @param [options] the framing options.
 * @param [resolver(url, callback(err, jsonCtx))] the URL resolver to use.
 * @param callback(err, framed) called once the operation completes.
 */
jsonld.frame = function(input, frame) {
  // get arguments
  var resolver = jsonld.urlResolver;
  var options;
  var callbackArg = 2;
  if(arguments.length > 4) {
    options = arguments[2];
    resolver = arguments[3];
    callbackArg += 2;
  }
  else if(arguments.length > 3) {
    if(_isObject(arguments[2])) {
      options = arguments[2];
    }
    else {
      resolver = arguments[2];
    }
    callbackArg += 1;
  }
  var callback = arguments[callbackArg];

  // set default options
  options = options || {};
  if(!('embed' in options)) {
    options.embed = true;
  }
  options.explicit = options.explicit || false;
  options.omitDefault = options.omitDefault || false;
  options.optimize = options.optimize || false;

  // clone frame
  frame = _clone(frame);
  frame['@context'] = frame['@context'] || {};

  // compact the input according to the frame context
  jsonld.compact(input, frame['@context'], options.optimize, resolver,
    function(err, compacted) {
      if(err) {
        return callback(new JsonLdError(
          'Could not compact input before framing.',
          'jsonld.FrameError', {cause: err}));
      }

      // preserve compacted context
      var ctx = compacted['@context'] || {};
      delete compacted['@context'];

      // merge context
      jsonld.mergeContexts({}, ctx, function(err, merged) {
        if(err) {
          return callback(new JsonLdError(
            'Could not merge context before framing.',
            'jsonld.FrameError', {cause: err}));
        }

        try {
          // do framing
          var framed = new Processor().frame(compacted, frame, merged, options);

          // attach context to each framed entry
          if(Object.keys(ctx).length > 0) {
            for(var i in framed) {
              var next = framed[i];
              if(_isObject(next)) {
                // reorder keys so @context is first
                framed[i] = {'@context': ctx};
                for(var key in next) {
                  framed[i][key] = next[key];
                }
              }
            }
          }
          callback(null, framed);
        }
        catch(ex) {
          callback(ex);
        }
      });
    });
};

/**
 * Performs JSON-LD normalization.
 *
 * @param input the JSON-LD object to normalize.
 * @param [resolver(url, callback(err, jsonCtx))] the URL resolver to use.
 * @param callback(err, normalized) called once the operation completes.
 */
jsonld.normalize = function(input, callback) {
  // get arguments
  var resolver = jsonld.urlResolver;
  var callback;
  var callbackArg = 1;
  if(arguments.length > 2) {
    resolver = arguments[1];
    callbackArg += 1;
  }
  callback = arguments[callbackArg];

  // expand input then do normalization
  jsonld.expand(input, function(err, expanded) {
    if(err) {
      return callback(new JsonLdError(
        'Could not expand input before normalization.',
        'jsonld.NormalizeError', {cause: err}));
    }

    // do normalization
    new Processor().normalize(expanded, callback);
  });
};

/**
 * Outputs the triples found in the given JSON-LD object.
 *
 * @param input the JSON-LD object.
 * @param [resolver(url, callback(err, jsonCtx))] the URL resolver to use.
 * @param callback(err, triple) called when a triple is output, with the last
 *          triple as null.
 */
jsonld.triples = function(input, callback) {
  // get arguments
  var resolver = jsonld.urlResolver;
  var callback;
  var callbackArg = 1;
  if(arguments.length > 2) {
    resolver = arguments[1];
    callbackArg += 1;
  }
  callback = arguments[callbackArg];

  // resolve all @context URLs in the input
  input = _clone(input);
  _resolveUrls(input, resolver, function(err, input) {
    if(err) {
      return callback(err);
    }
    // output triples
    return new Processor().triples(input, callback);
  });
};

/**
 * The default URL resolver for external @context URLs.
 *
 * @param resolver(url, callback(err, ctx)) the resolver to use.
 */
jsonld.urlResolver = function(url, callback) {
  return callback(new JsonLdError(
    'Could not resolve @context URL. URL resolution not implemented.',
    'jsonld.ContextUrlError'));
};

/* Utility API */

/**
 * URL resolvers.
 */
jsonld.urlResolvers = {};

/**
 * The built-in jquery URL resolver.
 */
jsonld.urlResolvers['jquery'] = function($) {
  return function(url, callback) {
    $.ajax({
      url: url,
      dataType: 'json',
      crossDomain: true,
      success: function(data, textStatus, jqXHR) {
        callback(null, data);
      },
      error: function(jqXHR, textStatus, errorThrown) {
        callback(errorThrown);
      }
    });
  };
};

/**
 * The built-in node URL resolver.
 */
jsonld.urlResolvers['node'] = function() {
  var request = require('request');
  return function(url, callback) {
    request(url, function(err, res, body) {
      callback(err, body);
    });
  };
};

/**
 * Assigns the default URL resolver for external @context URLs to a built-in
 * default. Supported types currently include: 'jquery'.
 *
 * To use the jquery URL resolver, the 'data' parameter must be a reference
 * to the main jquery object.
 *
 * @param type the type to set.
 * @param [params] the parameters required to use the resolver.
 */
jsonld.useUrlResolver = function(type) {
  if(!(type in jsonld.urlResolvers)) {
    throw new JsonLdError(
      'Unknown @context URL resolver type: "' + type + '"',
      'jsonld.UnknownUrlResolver',
      {type: type});
  }

  // set URL resolver
  jsonld.urlResolver = jsonld.urlResolvers[type].apply(
    jsonld, Array.prototype.slice.call(arguments, 1));
};

/**
 * Merges one context with another, resolving any URLs as necessary.
 *
 * @param ctx1 the context to overwrite/append to.
 * @param ctx2 the new context to merge onto ctx1.
 * @param [resolver(url, callback(err, jsonCtx))] the URL resolver to use.
 * @param callback(err, ctx) called once the operation completes.
 */
jsonld.mergeContexts = function(ctx1, ctx2) {
  // return empty context early for null context
  if(ctx2 === null) {
    return {};
  }

  // get arguments
  var resolver = jsonld.urlResolver;
  var callbackArg = 2;
  if(arguments.length > 3) {
    resolver = arguments[2];
    callbackArg += 1;
  }
  var callback = arguments[callbackArg];

  // default to empty context
  ctx1 = _clone(ctx1 || {});
  ctx2 = _clone(ctx2 || {});

  // resolve URLs in ctx1
  _resolveUrls({'@context': ctx1}, resolver, function(err, ctx1) {
    if(err) {
      return callback(err);
    }
    // resolve URLs in ctx2
    _resolveUrls({'@context': ctx2}, resolver, function(err, ctx2) {
      if(err) {
        return callback(err);
      }
      try {
        // do merge
        var merged = new Processor().mergeContexts(
          ctx1['@context'], ctx2['@context']);
        callback(null, merged);
      }
      catch(ex) {
        callback(ex);
      }
    });
  });
};

/**
 * Returns true if the given subject has the given property.
 *
 * @param subject the subject to check.
 * @param property the property to look for.
 *
 * @return true if the subject has the given property, false if not.
 */
jsonld.hasProperty = function(subject, property) {
  var rval = false;
  if(property in subject) {
    var value = subject[property];
    rval = (!_isArray(value) || value.length > 0);
  }
  return rval;
};

/**
 * Determines if the given value is a property of the given subject.
 *
 * @param subject the subject to check.
 * @param property the property to check.
 * @param value the value to check.
 *
 * @return true if the value exists, false if not.
 */
jsonld.hasValue = function(subject, property, value) {
  var rval = false;
  if(jsonld.hasProperty(subject, property)) {
    var val = subject[property];
    var isList = _isListValue(val);
    if(_isArray(val) || isList) {
      if(isList) {
        val = val['@list'];
      }
      for(var i in val) {
        if(jsonld.compareValues(value, val[i])) {
          rval = true;
          break;
        }
      }
    }
    // avoid matching the set of values with an array value parameter
    else if(!_isArray(value)) {
      rval = jsonld.compareValues(value, val);
    }
  }
  return rval;
};

/**
 * Adds a value to a subject. If the subject already has the value, it will
 * not be added. If the value is an array, all values in the array will be
 * added.
 *
 * Note: If the value is a subject that already exists as a property of the
 * given subject, this method makes no attempt to deeply merge properties.
 * Instead, the value will not be added.
 *
 * @param subject the subject to add the value to.
 * @param property the property that relates the value to the subject.
 * @param value the value to add.
 * @param [propertyIsArray] true if the property is always an array, false
 *          if not (default: false).
 */
jsonld.addValue = function(subject, property, value, propertyIsArray) {
  propertyIsArray = _isUndefined(propertyIsArray) ? false : propertyIsArray;

  if(_isArray(value)) {
    for(var i in value) {
      jsonld.addValue(subject, property, value[i], propertyIsArray);
    }
  }
  else if(_isListValue(value)) {
    // create list
    if(!(property in subject)) {
      subject[property] = {'@list': []};
    }
    // add list values
    var list = value['@list'];
    for(var i in list) {
      jsonld.addValue(subject, property, list[i]);
    }
  }
  else if(property in subject) {
    var hasValue = jsonld.hasValue(subject, property, value);

    // make property an array if value not present or always an array
    var isList = _isListValue(subject[property]);
    if(!_isArray(subject[property]) && !isList &&
      (!hasValue || propertyIsArray)) {
      subject[property] = [subject[property]];
    }

    // add new value
    if(!hasValue) {
      if(isList) {
        subject[property]['@list'].push(value);
      }
      else {
        subject[property].push(value);
      }
    }
  }
  else {
    // add new value as set or single value
    subject[property] = propertyIsArray ? [value] : value;
  }
};

/**
 * Gets all of the values for a subject's property as an array.
 *
 * @param subject the subject.
 * @param property the property.
 *
 * @return all of the values for a subject's property as an array.
 */
jsonld.getValues = function(subject, property) {
  var rval = subject[property] || [];
  if(!_isArray(rval)) {
    rval = [rval];
  }
  return rval;
};

/**
 * Removes a property from a subject.
 *
 * @param subject the subject.
 * @param property the property.
 */
jsonld.removeProperty = function(subject, property) {
  delete subject[property];
};

/**
 * Removes a value from a subject.
 *
 * @param subject the subject.
 * @param property the property that relates the value to the subject.
 * @param value the value to remove.
 * @param [propertyIsArray] true if the property is always an array, false
 *          if not (default: false).
 */
jsonld.removeValue = function(subject, property, value, propertyIsArray) {
  propertyIsArray = _isUndefined(propertyIsArray) ? false : propertyIsArray;

  // filter out value
  var values = jsonld.getValues(subject, property).filter(function(e) {
    return !jsonld.compareValues(e, value);
  });

  if(values.length === 0) {
    jsonld.removeProperty(subject, property);
  }
  else if(values.length === 1 && !propertyIsArray) {
    subject[property] = values[0];
  }
  else {
    subject[property] = values;
  }
};

/**
 * Compares two JSON-LD values for equality. Two JSON-LD values will be
 * considered equal if:
 *
 * 1. They are both primitives of the same type and value.
 * 2. They are both @values with the same @value, @type, and @language, OR
 * 3. They both have @ids they are the same.
 *
 * @param v1 the first value.
 * @param v2 the second value.
 *
 * @return true if v1 and v2 are considered equal, false if not.
 */
jsonld.compareValues = function(v1, v2) {
  // 1. equal primitives
  if(v1 === v2) {
    return true;
  }

  // 2. equal @values
  if(_isValue(v1) && _isValue(v2) &&
    v1['@value'] === v2['@value'] &&
    v1['@type'] === v2['@type'] &&
    v2['@language'] === v2['@language']) {
    return true;
  }

  // 3. equal @ids
  if(_isObject(v1) && ('@id' in v1) && _isObject(v2) && ('@id' in v2)) {
    return v1['@id'] === v2['@id'];
  }

  return false;
};

/**
 * Compares two JSON-LD normalized inputs for equality.
 *
 * @param n1 the first normalized input.
 * @param n2 the second normalized input.
 *
 * @return true if the inputs are equivalent, false if not.
 */
jsonld.compareNormalized = function(n1, n2) {
  if(!_isArray(n1) || !_isArray(n2)) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; normalized JSON-LD must be an array.',
      'jsonld.SyntaxError');
  }

  // different # of subjects
  if(n1.length !== n2.length) {
    return false;
  }

  // assume subjects are in the same order because of normalization
  for(var i in n1) {
    var s1 = n1[i];
    var s2 = n2[i];

    // different @ids
    if(s1['@id'] !== s2['@id']) {
      return false;
    }

    // subjects have different properties
    if(Object.keys(s1).length !== Object.keys(s2).length) {
      return false;
    }

    for(var p in s1) {
      // skip @id property
      if(p === '@id') {
        continue;
      }

      // s2 is missing s1 property
      if(!jsonld.hasProperty(s2, p)) {
        return false;
      }

      // subjects have different objects for the property
      if(s1[p].length !== s2[p].length) {
        return false;
      }

      var objects = s1[p];
      for(var oi in objects) {
        // s2 is missing s1 object
        if(!jsonld.hasValue(s2, p, objects[oi])) {
          return false;
        }
      }
    }
  }

  return true;
};

/**
 * Gets the value for the given @context key and type, null if none is set.
 *
 * @param ctx the context.
 * @param key the context key.
 * @param [type] the type of value to get (eg: '@id', '@type'), if not
 *          specified gets the entire entry for a key, null if not found.
 * @param [expand] true to expand the value, false not to (default: true).
 *
 * @return the value.
 */
jsonld.getContextValue = function(ctx, key, type, expand) {
  var rval = null;

  // return null for invalid key
  if(!key) {
    rval = null;
  }
  // return entire context entry if type is unspecified
  else if(_isUndefined(type)) {
    rval = ctx[key] || null;
  }
  else if(key in ctx) {
    var entry = ctx[key];
    if(_isObject(entry)) {
      if(type in entry) {
        rval = entry[type];
      }
    }
    else if(_isString(entry)) {
      if(type === '@id') {
        rval = entry;
      }
    }
    else {
      throw new JsonLdError(
        'Invalid @context value for key "' + key + '".',
        'jsonld.InvalidContext',
        {context: ctx, key: key});
    }

    if(rval !== null) {
      // expand term if requested
      expand = _isUndefined(expand) ? true : expand;
      if(expand) {
        rval = _expandTerm(ctx, rval);
      }
    }
  }

  return rval;
};

/**
 * Sets a value for the given @context key and type.
 *
 * @param ctx the context.
 * @param key the context key.
 * @param type the type of value to set (eg: '@id', '@type').
 * @param value the value to use.
 */
jsonld.setContextValue = function(ctx, key, type, value) {
  // compact key
  key = _compactIri(ctx, key);

  // get keyword for type
  var kwtype = _getKeywords(ctx)[type];

  // add new key to @context or update existing key w/string value
  if(!(key in ctx) || _isString(ctx[key])) {
    if(type === '@id') {
      ctx[key] = value;
    }
    else {
      ctx[key] = {};
      ctx[key][kwtype] = value;
    }
  }
  // update existing key w/object value
  else if(_isObject(ctx[key])) {
    ctx[key][kwtype] = value;
  }
  else {
    throw new JsonLdError(
      'Invalid @context value for key "' + key + '".',
      'jsonld.InvalidContext',
      {context: ctx, key: key});
  }
};

// determine if in-browser or using node.js
var _nodejs = (typeof module !== 'undefined');
var _browser = !_nodejs;

// export nodejs API
if(_nodejs) {
  module.exports = jsonld;
  // use node URL resolver by default
  jsonld.useUrlResolver('node');
}

// export browser API
if(_browser) {
  window.jsonld = window.jsonld || jsonld;
}

// constants
var XSD = {
  'boolean': 'http://www.w3.org/2001/XMLSchema#boolean',
  'double': 'http://www.w3.org/2001/XMLSchema#double',
  'integer': 'http://www.w3.org/2001/XMLSchema#integer'
};
var RDF = {
  'first': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first',
  'rest': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest',
  'nil': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil',
  'type': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
};

/**
 * A JSON-LD Error.
 *
 * @param msg the error message.
 * @param type the error type.
 * @param details the error details.
 */
var JsonLdError = function(msg, type, details) {
  if(_nodejs) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
  }
  this.name = type || 'jsonld.Error';
  this.message = msg || 'An unspecified JSON-LD error occurred.';
  this.details = details || {};
};
if(_nodejs) {
  require('util').inherits(JsonLdError, Error);
}

/**
 * Constructs a new JSON-LD Processor.
 */
var Processor = function() {};

/**
 * Recursively compacts a value using the given context. All context URLs
 * must have been resolved before calling this method and all values must
 * be in expanded form.
 *
 * @param ctx the context to use.
 * @param property the property that points to the value, null for none.
 * @param value the value to compact.
 * @param [optimizeCtx] the context to populate with optimizations.
 *
 * @return the compacted value.
 */
Processor.prototype.compact = function(ctx, property, value, optimizeCtx) {
  // null is already compact
  if(value === null) {
    return null;
  }

  // recursively compact array or list
  var isList = _isListValue(value);
  if(_isArray(value) || isList) {
    // get array from @list
    if(isList) {
      value = value['@list'];

      // nothing to compact in null case
      if(value === null) {
        return null;
      }
      // invalid input if @list points at a non-array
      else if(!_isArray(value)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; "@list" value must be an array or null.',
          'jsonld.SyntaxError');
      }
    }

    // recurse through array
    var rval = [];
    for(var i in value) {
      // compact value and add if non-null
      var val = this.compact(ctx, property, value[i], optimizeCtx);
      if(val !== null) {
        rval.push(val);
      }
    }

    // use @list if previously used unless @context specifies container @list
    // which indicates value should be a simple array
    if(isList) {
      var prop = _compactIri(ctx, property);
      var container = jsonld.getContextValue(ctx, prop, '@container');
      var useList = (container !== '@list');
      if(useList) {
        // if optimizing, add @container entry
        if(optimizeCtx && container === null) {
          jsonld.setContextValue(optimizeCtx, prop, '@container', '@list');
        }
        else {
          rval = {'@list': rval};
        }
      }
    }
    return rval;
  }

  // replace '@graph' keyword and recurse
  if(_isObject(value) && '@graph' in value) {
    var kwgraph = _getKeywords(ctx)['@graph'];
    var rval = {};
    rval[kwgraph] = this.compact(ctx, property, value['@graph'], optimizeCtx);
    return rval;
  }

  // optimize away use of @set
  if(_isSetValue(value)) {
    return this.compact(ctx, property, value['@set'], optimizeCtx);
  }

  // try to type-compact value
  if(_canTypeCompact(value)) {
    // compact property to look for its @type definition in the context
    var prop = _compactIri(ctx, property);
    var type = jsonld.getContextValue(ctx, prop, '@type');
    if(type !== null) {
      var key = _isValue(value) ? '@value' : '@id';

      // compact IRI
      if(type === '@id') {
        return _compactIri(ctx, value[key]);
      }
      // other type, return string value
      else {
        return value[key];
      }
    }
  }

  // recursively compact object
  if(_isObject(value)) {
    var keywords = _getKeywords(ctx);
    var rval = {};
    for(var key in value) {
      // compact non-context
      if(key !== '@context') {
        // FIXME: this should just be checking for absolute IRI or keyword
        // drop unmapped and non-absolute IRI keys that aren't keywords
        if(!jsonld.getContextValue(ctx, key) && !_isAbsoluteIri(key) &&
          !(key in keywords)) {
          continue;
        }

        // compact property and value
        var prop = _compactIri(ctx, key);
        var val = this.compact(ctx, key, value[key], optimizeCtx);

        // preserve empty arrays
        if(_isArray(val) && val.length === 0 && !(prop in rval)) {
          rval[prop] = [];
        }

        // add non-null value
        var values = [];
        if(val !== null) {
          // optimize value compaction if optimize context is given
          if(optimizeCtx) {
            val = _optimalTypeCompact(ctx, prop, val, optimizeCtx);
          }

          // determine if an array should be used by @container specification
          var container = jsonld.getContextValue(ctx, prop, '@container');
          var isArray = (container === '@set' || container === '@list');
          jsonld.addValue(rval, prop, val, isArray);
        }
      }
    }
    // drop empty objects when optimizing
    if(optimizeCtx && Object.keys(rval).length === 0) {
      rval = null;
    }
    return rval;
  }

  // compact @id or @type string
  var prop = _expandTerm(ctx, property);
  if(prop === '@id' || prop === '@type') {
    return _compactIri(ctx, value);
  }

  // only primitives remain which are already compact
  return value;
};

/**
 * Recursively expands a value using the given context. Any context in
 * the value will be removed. All context URLs must have been resolved before
 * calling this method.
 *
 * @param ctx the context to use.
 * @param property the expanded property for the value, null for none.
 * @param value the value to expand.
 *
 * @return the expanded value.
 */
Processor.prototype.expand = function(ctx, property, value) {
  // nothing to expand when value is null
  if(value === null) {
    return null;
  }

  // if no property is specified and the value is a string (this means the
  // value is a property itself), expand to an IRI
  if(property === null && _isString(value)) {
    return _expandTerm(ctx, value);
  }

  // recursively expand array and @list
  var isList = _isListValue(value);
  if(_isArray(value) || isList) {
    // get array from @list
    if(isList) {
      value = value['@list'];

      // nothing to expand in null case
      if(value === null) {
        return null;
      }

      // invalid input if @list points at a non-array
      if(!_isArray(value)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; "@list" value must be an array or null.',
          'jsonld.SyntaxError');
      }
    }

    // recurse through array
    var rval = [];
    for(var i in value) {
      var val = value[i];
      if(_isArray(val)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; arrays of arrays are not permitted.',
          'jsonld.SyntaxError');
      }
      // expand value and add if non-null
      val = this.expand(ctx, property, val);
      if(val !== null) {
        rval.push(val);
      }
    }

    // use @list if previously used or if @context indicates it is one
    if(property !== null) {
      var prop = _compactIri(ctx, property);
      var container = jsonld.getContextValue(ctx, prop, '@container');
      isList = isList || (container === '@list');
      if(isList) {
        rval = {'@list': rval};
      }
    }
    return rval;
  }

  // optimize away use of @set
  if(_isSetValue(value)) {
    return this.expand(ctx, property, value['@set']);
  }

  // recursively expand object
  if(_isObject(value)) {
    // determine if value is a subject
    var isSubject = _isSubject(value) || (property === null);

    // if value has a context, merge it in
    if('@context' in value) {
      ctx = this.mergeContexts(ctx, value['@context']);
    }

    // optimize away use of @graph
    var keywords = _getKeywords(ctx);
    var kwgraph = keywords['@graph'];
    if('@graph' in value) {
      return this.expand(ctx, property, value['@graph']);
    }

    // recurse into object
    var rval = {};
    for(var key in value) {
      // expand non-context
      if(key !== '@context') {
        // expand property
        var prop = _expandTerm(ctx, key);

        // drop non-absolute IRI keys that aren't keywords
        if(!_isAbsoluteIri(prop) && !(prop in keywords)) {
          continue;
        }

        // syntax error if @id is not a string
        if(prop === '@id' && !_isString(value[key])) {
          throw new JsonLdError(
            'Invalid JSON-LD syntax; "@id" value must a string.',
            'jsonld.SyntaxError');
        }

        // expand value
        var val = this.expand(ctx, prop, value[key]);

        // preserve empty arrays
        if(_isArray(val) && val.length === 0 && !(prop in rval)) {
          rval[prop] = [];
        }

        // add non-null expanded value
        if(val !== null) {
          // always use array for subjects except for @id key and @list
          var useArray = isSubject && (prop !== '@id') && !_isListValue(val);
          jsonld.addValue(rval, prop, val, useArray);
        }
      }
    }
    return rval;
  }

  // expand value
  return _expandValue(ctx, property, value);
};

/**
 * Performs JSON-LD framing.
 *
 * @param input the compacted JSON-LD object to frame.
 * @param frame the JSON-LD frame to use.
 * @param ctx the input's context.
 * @param options the framing options.
 *
 * @return the framed output.
 */
Processor.prototype.frame = function(input, frame, ctx, options) {
  // create framing state
  var state = {
    context: ctx,
    keywords: _getKeywords(ctx),
    options: options,
    subjects: {},
    embeds: {}
  };

  // produce a map of all subjects and name each bnode
  var namer = new UniqueNamer('_:t');
  _getFramingSubjects(state, input, namer);

  // frame the subjects
  var framed = [];
  _frame(state, state.subjects, frame, framed, null);
  return framed;
};

/**
 * Performs JSON-LD normalization.
 *
 * @param input the expanded JSON-LD object to normalize.
 * @param callback(err, normalized) called once the operation completes.
 */
Processor.prototype.normalize = function(input, callback) {
  // get statements
  var namer = new UniqueNamer('_:t');
  var bnodes = {};
  var subjects = {};
  _getStatements(input, namer, bnodes, subjects);

  // create canonical namer
  namer = new UniqueNamer('_:c14n');

  // generates unique and duplicate hashes for bnodes
  hashBlankNodes(Object.keys(bnodes));
  function hashBlankNodes(unnamed) {
    var nextUnnamed = [];
    var duplicates = {};
    var unique = {};

    // hash statements for each unnamed bnode
    setTimeout(function() {hashUnnamed(0);}, 0);
    function hashUnnamed(i) {
      if(i === unnamed.length) {
        // done, name blank nodes
        return nameBlankNodes(unique, duplicates, nextUnnamed);
      }

      // hash unnamed bnode
      var bnode = unnamed[i];
      var statements = bnodes[bnode];
      var hash = _hashStatements(statements, namer);

      // store hash as unique or a duplicate
      if(hash in duplicates) {
        duplicates[hash].push(bnode);
        nextUnnamed.push(bnode);
      }
      else if(hash in unique) {
        duplicates[hash] = [unique[hash], bnode];
        nextUnnamed.push(unique[hash]);
        nextUnnamed.push(bnode);
        delete unique[hash];
      }
      else {
        unique[hash] = bnode;
      }

      // hash next unnamed bnode
      setTimeout(function() {hashUnnamed(i + 1);}, 0);
    }
  }

  // names unique hash bnodes
  function nameBlankNodes(unique, duplicates, unnamed) {
    // name unique bnodes in sorted hash order
    var named = false;
    var hashes = Object.keys(unique).sort();
    for(var i in hashes) {
      var bnode = unique[hashes[i]];
      namer.getName(bnode);
      named = true;
    }

    // continue to hash bnodes if a bnode was assigned a name
    if(named) {
      hashBlankNodes(unnamed);
    }
    // name the duplicate hash bnodes
    else {
      nameDuplicates(duplicates);
    }
  }

  // names duplicate hash bnodes
  function nameDuplicates(duplicates) {
    // enumerate duplicate hash groups in sorted order
    var hashes = Object.keys(duplicates).sort();

    // process each group
    processGroup(0);
    function processGroup(i) {
      if(i === hashes.length) {
        // done, create JSON-LD array
        return createArray();
      }

      // name each group member
      var group = duplicates[hashes[i]];
      var results = [];
      nameGroupMember(group, 0);
      function nameGroupMember(group, n) {
        if(n === group.length) {
          // name bnodes in hash order
          results.sort(function(a, b) {
            a = a.hash;
            b = b.hash;
            return (a < b) ? -1 : ((a > b) ? 1 : 0);
          });
          for(var r in results) {
            // name all bnodes in path namer in key-entry order
            // Note: key-order is preserved in javascript
            for(var key in results[r].pathNamer.existing) {
              namer.getName(key);
            }
          }
          return processGroup(i + 1);
        }

        // skip already-named bnodes
        var bnode = group[n];
        if(namer.isNamed(bnode)) {
          return nameGroupMember(group, n + 1);
        }

        // hash bnode paths
        var pathNamer = new UniqueNamer('_:t');
        pathNamer.getName(bnode);
        _hashPaths(bnodes, bnodes[bnode], namer, pathNamer,
          function(err, result) {
            if(err) {
              return callback(err);
            }
            results.push(result);
            nameGroupMember(group, n + 1);
          });
      }
    };
  }

  // creates the normalized JSON-LD array
  function createArray() {
    var normalized = [];

    // add all bnodes
    for(var id in bnodes) {
      // add all property statements to bnode
      var name = namer.getName(id);
      var bnode = {'@id': name};
      var statements = bnodes[id];
      for(var i in statements) {
        var statement = statements[i];
        if(statement.s === '_:a') {
          var z = _getBlankNodeName(statement.o);
          var o = z ? {'@id': namer.getName(z)} : statement.o;
          jsonld.addValue(bnode, statement.p, o, true);
        }
      }
      normalized.push(bnode);
    }

    // add all non-bnodes
    for(var id in subjects) {
      // add all statements to subject
      var subject = {'@id': id};
      var statements = subjects[id];
      for(var i in statements) {
        var statement = statements[i];
        var z = _getBlankNodeName(statement.o);
        var o = z ? {'@id': namer.getName(z)} : statement.o;
        jsonld.addValue(subject, statement.p, o, true);
      }
      normalized.push(subject);
    }

    // sort normalized output by @id
    normalized.sort(function(a, b) {
      a = a['@id'];
      b = b['@id'];
      return (a < b) ? -1 : ((a > b) ? 1 : 0);
    });

    callback(null, normalized);
  }
};

/**
 * Outputs the triples found in the given JSON-LD object.
 *
 * @param input the JSON-LD object.
 * @param callback(err, triple) called when a triple is output, with the last
 *          triple as null.
 */
Processor.prototype.triples = function(input, callback) {
  // FIXME: implement
  callback(new JsonLdError('Not implemented', 'jsonld.NotImplemented'), null);
};

/**
 * Merges a context onto another.
 *
 * @param ctx1 the original context.
 * @param ctx2 the new context to merge in.
 *
 * @return the resulting merged context.
 */
Processor.prototype.mergeContexts = function(ctx1, ctx2) {
  // flatten array context
  if(_isArray(ctx1)) {
    ctx1 = this.mergeContexts({}, ctx1);
  }

  // init return value as copy of first context
  var rval = _clone(ctx1);

  if(ctx2 === null) {
    // reset to blank context
    rval = {};
  }
  else if(_isArray(ctx2)) {
    // flatten array context in order
    for(var i in ctx2) {
      rval = this.mergeContexts(rval, ctx2[i]);
    }
  }
  else if(_isObject(ctx2)) {
    // if the ctx2 has a new definition for an IRI (possibly using a new
    // key), then the old definition must be removed
    for(var key in ctx2) {
      var newIri = jsonld.getContextValue(ctx2, key, '@id');

      // no IRI defined, skip
      if(newIri === null) {
        continue;
      }

      for(var mkey in rval) {
        // matching IRI, remove old entry
        if(newIri === jsonld.getContextValue(rval, mkey, '@id')) {
          delete rval[mkey];
          break;
        }
      }
    }

    // merge contexts
    for(var key in ctx2) {
      rval[key] = ctx2[key];
    }
  }
  else {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; @context must be an array, object or ' +
      'absolute IRI string.',
      'jsonld.SyntaxError');
  }

  return rval;
};

/**
 * Expands the given value by using the coercion and keyword rules in the
 * given context.
 *
 * @param ctx the context to use.
 * @param property the expanded property the value is associated with.
 * @param value the value to expand.
 *
 * @return the expanded value.
 */
function _expandValue(ctx, property, value) {
  // default to simple string return value
  var rval = value;

  // special-case expand @id and @type (skips '@id' expansion)
  if(property === '@id' || property === '@type') {
    rval = _expandTerm(ctx, value);
  }
  else {
    // compact property to look for its type definition in the context
    var prop = _compactIri(ctx, property);
    var type = jsonld.getContextValue(ctx, prop, '@type');

    // do @id expansion
    if(type === '@id') {
      rval = {'@id': _expandTerm(ctx, value)};
    }
    // other type
    else if(type !== null) {
      rval = {'@value': String(value), '@type': type};
    }
  }

  return rval;
};

/**
 * Recursively gets all statements from the given expanded JSON-LD input.
 *
 * @param input the valid expanded JSON-LD input.
 * @param namer the UniqueNamer to use when encountering blank nodes.
 * @param bnodes the blank node statements map to populate.
 * @param subjects the subject statements map to populate.
 * @param [name] the name (@id) assigned to the current input.
 */
function _getStatements(input, namer, bnodes, subjects, name) {
  // recurse into arrays
  if(_isArray(input)) {
    for(var i in input) {
      _getStatements(input[i], namer, bnodes, subjects);
    }
  }
  // safe to assume input is a subject/blank node
  else {
    var isBnode = _isBlankNode(input);

    // name blank node if appropriate, use passed name if given
    if(_isUndefined(name)) {
      name = isBnode ? namer.getName(input['@id']) : input['@id'];
    }

    // use a subject of '_:a' for blank node statements
    var s = isBnode ? '_:a' : name;

    // get statements for the blank node
    var entries;
    if(isBnode) {
      entries = bnodes[name] = bnodes[name] || [];
    }
    else {
      entries = subjects[name] = subjects[name] || [];
    }

    // add all statements in input
    for(var p in input) {
      // skip @id
      if(p === '@id') {
        continue;
      }

      var objects = input[p];
      var isList = _isListValue(objects);
      if(isList) {
        // convert @list array into embedded blank node linked list
        objects = _makeLinkedList(objects);
      }
      for(var i in objects) {
        var o = objects[i];

        // convert boolean to @value
        if(_isBoolean(o)) {
          o = {'@value': String(o), '@type': XSD['boolean']};
        }
        // convert double to @value
        else if(_isDouble(o)) {
          // do special JSON-LD double format, printf('%1.16e') JS equivalent
          o = o.toExponential(16).replace(/(e(?:\+|-))([0-9])$/, '$10$2');
          o = {'@value': o, '@type': XSD['double']};
        }
        // convert integer to @value
        else if(_isNumber(o)) {
          o = {'@value': String(o), '@type': XSD['integer']};
        }

        // object is a blank node
        if(_isBlankNode(o)) {
          // name object position blank node
          var oName = namer.getName(o['@id']);

          // add property statement
          _addStatement(entries, {s: s, p: p, o: {'@id': oName}});

          // add reference statement
          var oEntries = bnodes[oName] = bnodes[oName] || [];
          _addStatement(oEntries, {s: name, p: p, o: {'@id': '_:a'}});

          // recurse into blank node
          _getStatements(o, namer, bnodes, subjects, oName);
        }
        // object is a string, @value, subject reference
        else if(_isString(o) || _isValue(o) || _isSubjectReference(o)) {
          // add property statement
          _addStatement(entries, {s: s, p: p, o: o});

          // ensure a subject entry exists for subject reference
          if(_isSubjectReference(o)) {
            subjects[o['@id']] = subjects[o['@id']] || [];
          }
        }
        // object must be an embedded subject
        else {
          // add property statement
          _addStatement(entries, {s: s, p: p, o: {'@id': o['@id']}});

          // recurse into subject
          _getStatements(o, namer, bnodes, subjects);
        }
      }
    }
  }
};

/**
 * Converts a @list value into an embedded linked list of blank nodes in
 * expanded form. The resulting array can be used as an RDF-replacement for
 * a property that used a @list.
 *
 * @param value the @list value.
 *
 * @return the linked list of blank nodes.
 */
function _makeLinkedList(value) {
  // convert @list array into embedded blank node linked list
  var list = value['@list'];
  var first = RDF['first'];
  var rest = RDF['rest'];
  var nil = RDF['nil'];

  // build linked list in reverse
  var len = list.length;
  var tail = {'@id': nil};
  for(var i = len - 1; i >= 0; --i) {
    var e = {};
    e[first] = [list[i]];
    e[rest] = [tail];
    tail = e;
  }

  return [tail];
}

/**
 * Adds a statement to an array of statements. If the statement already exists
 * in the array, it will not be added.
 *
 * @param statements the statements array.
 * @param statement the statement to add.
 */
function _addStatement(statements, statement) {
  for(var i in statements) {
    var s = statements[i];
    if(s.s === statement.s && s.p === statement.p &&
      jsonld.compareValues(s.o, statement.o)) {
      return;
    }
  }
  statements.push(statement);
}

/**
 * Hashes all of the statements about a blank node.
 *
 * @param statements the statements about the bnode.
 * @param namer the canonical bnode namer.
 *
 * @return the new hash.
 */
function _hashStatements(statements, namer) {
  // serialize all statements
  var triples = [];
  for(var i in statements) {
    var statement = statements[i];

    // serialize triple
    var triple = '';

    // serialize subject
    if(statement.s === '_:a') {
      triple += '_:a';
    }
    else if(statement.s.indexOf('_:') === 0) {
      var id = statement.s;
      id = namer.isNamed(id) ? namer.getName(id) : '_:z';
      triple += id;
    }
    else {
      triple += '<' + statement.s + '>';
    }

    // serialize property
    var p = (statement.p === '@type') ? RDF.type : statement.p;
    triple += ' <' + p + '> ';

    // serialize object
    if(_isBlankNode(statement.o)) {
      if(statement.o['@id'] === '_:a') {
        triple += '_:a';
      }
      else {
        var id = statement.o['@id'];
        id = namer.isNamed(id) ? namer.getName(id) : '_:z';
        triple += id;
      }
    }
    else if(_isString(statement.o)) {
      triple += '"' + statement.o + '"';
    }
    else if(_isSubjectReference(statement.o)) {
      triple += '<' + statement.o['@id'] + '>';
    }
    // must be a value
    else {
      triple += '"' + statement.o['@value'] + '"';

      if('@type' in statement.o) {
        triple += '^^<' + statement.o['@type'] + '>';
      }
      else if('@language' in statement.o) {
        triple += '@' + statement.o['@language'];
      }
    }

    // add triple
    triples.push(triple);
  }

  // sort serialized triples
  triples.sort();

  // return hashed triples
  return sha1.hash(triples);
}

/**
 * Produces a hash for the paths of adjacent bnodes for a bnode,
 * incorporating all information about its subgraph of bnodes. This
 * method will recursively pick adjacent bnode permutations that produce the
 * lexicographically-least 'path' serializations.
 *
 * @param bnodes the map of bnode statements.
 * @param statements the statements for the bnode to produce the hash for.
 * @param namer the canonical bnode namer.
 * @param pathNamer the namer used to assign names to adjacent bnodes.
 * @param callback(err, result) called once the operation completes.
 */
function _hashPaths(bnodes, statements, namer, pathNamer, callback) {
  // create SHA-1 digest
  var md = sha1.create();

  // group adjacent bnodes by hash, keep properties and references separate
  var groups = {};
  var cache = {};
  var groupHashes;
  setTimeout(function() {groupNodes(0);}, 0);
  function groupNodes(i) {
    if(i === statements.length) {
      // done, hash groups
      groupHashes = Object.keys(groups).sort();
      return hashGroup(0);
    }

    var statement = statements[i];
    var bnode = null;
    var direction = null;
    if(statement.s !== '_:a' && statement.s.indexOf('_:') === 0) {
      bnode = statement.s;
      direction = 'p';
    }
    else {
      bnode = _getBlankNodeName(statement.o);
      direction = 'r';
    }

    if(bnode) {
      // get bnode name (try canonical, path, then hash)
      var name;
      if(namer.isNamed(bnode)) {
        name = namer.getName(bnode);
      }
      else if(pathNamer.isNamed(bnode)) {
        name = pathNamer.getName(bnode);
      }
      else if(bnode in cache) {
        name = cache[bnode];
      }
      else {
        name = _hashStatements(bnodes[bnode], namer);
        cache[bnode] = name;
      }

      // hash direction, property, and bnode name/hash
      var md = sha1.create();
      md.update(direction);
      md.update((statement.p === '@type') ? RDF.type : statement.p);
      md.update(name);
      var groupHash = md.digest();

      // add bnode to hash group
      if(groupHash in groups) {
        groups[groupHash].push(bnode);
      }
      else {
        groups[groupHash] = [bnode];
      }
    }

    setTimeout(function() {groupNodes(i + 1);}, 0);
  }

  // hashes a group of adjacent bnodes
  function hashGroup(i) {
    if(i === groupHashes.length) {
      // done, return SHA-1 digest and path namer
      return callback(null, {hash: md.digest(), pathNamer: pathNamer});
    }

    // digest group hash
    var groupHash = groupHashes[i];
    md.update(groupHash);

    // choose a path and namer from the permutations
    var chosenPath = null;
    var chosenNamer = null;
    var permutator = new Permutator(groups[groupHash]);
    setTimeout(function() {permutate();}, 0);
    function permutate() {
      var permutation = permutator.next();
      var pathNamerCopy = pathNamer.clone();

      // build adjacent path
      var path = '';
      var recurse;
      for(var n in permutation) {
        var bnode = permutation[n];
        recurse = [];

        // use canonical name if available
        if(namer.isNamed(bnode)) {
          path += namer.getName(bnode);
        }
        else {
          // recurse if bnode isn't named in the path yet
          if(!pathNamerCopy.isNamed(bnode)) {
            recurse.push(bnode);
          }
          path += pathNamerCopy.getName(bnode);
        }

        // skip permutation if path is already >= chosen path
        if(chosenPath !== null && path.length >= chosenPath.length &&
          path > chosenPath) {
          return nextPermutation(true);
        }
      }

      // does the next recursion
      nextRecursion(0);
      function nextRecursion(n) {
        if(n === recurse.length) {
          // done, do next permutation
          return nextPermutation(false);
        }

        // do recursion
        var bnode = recurse[n];
        _hashPaths(bnodes, bnodes[bnode], namer, pathNamerCopy,
          function(err, result) {
            if(err) {
              return callback(err);
            }
            path += pathNamerCopy.getName(bnode) + '<' + result.hash + '>';
            pathNamerCopy = result.pathNamer;

            // skip permutation if path is already >= chosen path
            if(chosenPath !== null && path.length >= chosenPath.length &&
              path > chosenPath) {
              return nextPermutation(true);
            }

            // do next recursion
            nextRecursion(n + 1);
          });
      }

      // stores the results of this permutation and runs the next
      function nextPermutation(skipped) {
        if(!skipped && (chosenPath === null || path < chosenPath)) {
          chosenPath = path;
          chosenNamer = pathNamerCopy;
        }

        // do next permutation
        if(permutator.hasNext()) {
          setTimeout(function() {permutate();}, 0);
        }
        else {
          // digest chosen path and update namer
          md.update(chosenPath);
          pathNamer = chosenNamer;

          // hash the next group
          hashGroup(i + 1);
        }
      }
    }
  }
}

/**
 * A helper function that gets the blank node name from a statement value
 * (a subject or object). If the statement value is not a blank node or it
 * has an @id of '_:a', then null will be returned.
 *
 * @param value the statement value.
 *
 * @return the blank node name or null if none was found.
 */
function _getBlankNodeName(value) {
  return ((_isBlankNode(value) && value['@id'] !== '_:a') ?
    value['@id'] : null);
}

/**
 * Recursively gets the subjects in the given JSON-LD compact input for use
 * in the framing algorithm.
 *
 * @param state the current framing state.
 * @param input the JSON-LD compact input.
 * @param namer the blank node namer.
 * @param name the name assigned to the current input if it is a bnode.
 */
function _getFramingSubjects(state, input, namer, name) {
  var kwgraph = state.keywords['@graph'];
  var kwid = state.keywords['@id'];
  var kwlist = state.keywords['@list'];

  // recurse through array
  if(_isArray(input)) {
    for(var i in input) {
      _getFramingSubjects(state, input[i], namer);
    }
  }
  // recurse through @graph
  else if(_isObject(input) && (kwgraph in input)) {
    _getFramingSubjects(state, input[kwgraph], namer);
  }
  // input is a subject
  else if(_isObject(input)) {
    // get name for subject
    if(_isUndefined(name)) {
      name = _isBlankNode(input, state.keywords) ?
        namer.getName(input[kwid]) : input[kwid];
    }

    // create new subject or merge into existing one
    var subject = state.subjects[name] = state.subjects[name] || {};
    for(var prop in input) {
      // use assigned name for @id
      if(_isKeyword(state.keywords, prop, '@id')) {
        subject[prop] = name;
        continue;
      }

      // copy keywords
      if(_isKeyword(state.keywords, prop)) {
        subject[prop] = _clone(input[prop]);
        continue;
      }

      // determine if property @type is @id
      var isId = _isKeyword(state.keywords,
        jsonld.getContextValue(state.context, prop, '@type'), '@id');

      // normalize objects to array
      var objects = input[prop];
      // preserve list
      if(_isListValue(objects, state.keywords)) {
        var list = {};
        list[kwlist] = [];
        jsonld.addValue(subject, prop, list);
        objects = objects[kwlist];
      }
      var useArray = _isArray(objects);
      objects = useArray ? objects : [objects];
      for(var i in objects) {
        var o = objects[i];

        // get subject @id from expanded or compact form
        var sid = null;
        if(_isSubject(o, state.keywords) ||
          _isSubjectReference(o, state.keywords)) {
          if(kwid in o) {
            sid = o[kwid];
          }
          // rename blank node subject
          if(sid === null || o[kwid].indexOf('_:') === 0) {
            sid = namer.getName(sid);
          }
        }
        else if(_isString(o) && isId) {
          sid = o;
          o = {};
          o[kwid] = sid;
        }

        if(sid === null) {
          // add non-subject value
          jsonld.addValue(subject, prop, o, useArray);
        }
        else {
          // add a subject reference
          var ref;
          if(isId) {
            ref = sid;
          }
          else {
            ref = {};
            ref[kwid] = sid;
          }
          jsonld.addValue(subject, prop, ref, useArray);

          // recurse
          _getFramingSubjects(state, o, namer, sid);
        }
      }
    }
  }
}

/**
 * Frames subjects according to the given frame.
 *
 * @param state the current framing state.
 * @param subjects the subjects to filter.
 * @param frame the frame.
 * @param parent the parent subject or top-level array.
 * @param property the parent property, null for an array parent.
 */
function _frame(state, subjects, frame, parent, property) {
  // validate the frame
  _validateFrame(state, frame);

  // filter out subjects that match the frame
  var matches = _filterSubjects(state, subjects, frame);

  // get flags for current frame
  var options = state.options;
  var embedOn = _getFrameFlag(state, frame, options, 'embed');
  var explicitOn = _getFrameFlag(state, frame, options, 'explicit');

  // get keywords for @id, @list
  var kwid = state.keywords['@id'];
  var kwlist = state.keywords['@list'];

  // add matches to output
  for(var id in matches) {
    // start output
    var output = {};
    output[kwid] = id;

    // prepare embed meta info
    var embed = {parent: parent, property: property};

    // if embed is on and there is an existing embed
    if(embedOn && (id in state.embeds)) {
      // only overwrite an existing embed if it has already been added to its
      // parent -- otherwise its parent is somewhere up the tree from this
      // embed and the embed would occur twice once the tree is added
      embedOn = false;

      // existing embed's parent is an array
      var existing = state.embeds[id];
      if(_isArray(existing.parent)) {
        for(var i in existing.parent) {
          if(jsonld.compareValues(output, existing.parent[i])) {
            embedOn = true;
            break;
          }
        }
      }
      // existing embed's parent is an object
      else if(jsonld.hasValue(existing.parent, existing.property, output)) {
        embedOn = true;
      }

      // existing embed has already been added, so allow an overwrite
      if(embedOn) {
        _removeEmbed(state, id);
      }
    }

    // not embedding, add output without any other properties
    if(!embedOn) {
      _addFrameOutput(state, parent, property, output);
    }
    else {
      // add embed meta info
      state.embeds[id] = embed;

      // iterate over subject properties
      var subject = matches[id];
      for(var prop in subject) {
        // copy keywords to output
        if(_isKeyword(state.keywords, prop)) {
          output[prop] = _clone(subject[prop]);
          continue;
        }

        // if property isn't in the frame
        if(!(prop in frame)) {
          // if explicit is off, embed values
          if(!explicitOn) {
            _embedValues(state, subject, prop, output);
          }
          continue;
        }

        // determine if property @type is @id
        var isId = _isKeyword(state.keywords,
          jsonld.getContextValue(state.context, prop, '@type'), '@id');

        // add objects
        var objects = subject[prop];
        // preserve list
        if(_isListValue(objects, state.keywords)) {
          var list = {};
          list[kwlist] = [];
          jsonld.addValue(output, prop, list);
          objects = objects[kwlist];
        }
        objects = _isArray(objects) ? objects : [objects];
        for(var i in objects) {
          var o = objects[i];

          // get subject @id from expanded or compact form
          var sid = null;
          if(_isSubjectReference(o, state.keywords)) {
            sid = o[kwid];
          }
          else if(_isString(o) && isId) {
            sid = o;
          }

          // recurse into sub-subjects
          if(sid !== null) {
            var _subjects = {};
            _subjects[sid] = o;
            _frame(state, _subjects, frame[prop], output, prop);
          }
          // include other values automatically
          else {
            _addFrameOutput(state, output, prop, _clone(o));
          }
        }
      }

      var kwdefault = state.keywords['@default'];
      for(var prop in frame) {
        // skip keywords
        if(_isKeyword(state.keywords, prop)) {
          continue;
        }

        // if omit default is off, then include default values for properties
        // that appear in the next frame but are not in the matching subject
        var next = frame[prop];
        var omitDefaultOn = _getFrameFlag(state, next, options, 'omitDefault');
        if(!omitDefaultOn && !(prop in output)) {
          if(kwdefault in next) {
            output[prop] = _clone(next[kwdefault]);
          }
          // no frame @default, use [] for @set/@list and null otherwise
          else {
            var container = jsonld.getContextValue(
              state.context, prop, '@container');
            if(_isKeyword(state.keywords, container, '@set') ||
              _isKeyword(state.keywords, container, '@list')) {
              output[prop] = [];
            }
            else {
              output[prop] = null;
            }
          }
        }
      }

      // add output to parent
      _addFrameOutput(state, parent, property, output);
    }
  }
}

/**
 * Gets the frame flag value for the given flag name.
 *
 * @param state the current framing state.
 * @param frame the frame.
 * @param options the framing options.
 * @param name the flag name.
 *
 * @return the flag value.
 */
function _getFrameFlag(state, frame, options, name) {
  var kw = state.keywords['@' + name];
  return (kw in frame) ? frame[kw] : options[name];
};

/**
 * Validates a JSON-LD frame, throwing an exception if the frame is invalid.
 *
 * @param state the current frame state.
 * @param frame the frame to validate.
 */
function _validateFrame(state, frame) {
  if(!_isObject(frame)) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; a JSON-LD frame must be an object.',
      'jsonld.SyntaxError',
      {frame: frame});
  }
}

/**
 * Returns a map of all of the subjects that match a parsed frame.
 *
 * @param state the current framing state.
 * @param subjects the set of subjects to filter.
 * @param frame the parsed frame.
 *
 * @return all of the matched subjects.
 */
function _filterSubjects(state, subjects, frame) {
  var rval = {};
  for(var id in subjects) {
    var subject = state.subjects[id];
    if(_filterSubject(state, subject, frame)) {
      rval[id] = subject;
    }
  }
  return rval;
}

/**
 * Returns true if the given subject matches the given frame.
 *
 * @param state the current frame state.
 * @param subject the subject to check.
 * @param frame the frame to check.
 *
 * @return true if the subject matches, false if not.
 */
function _filterSubject(state, subject, frame) {
  var rval = false;

  // check @type
  var kwtype = state.keywords['@type'];
  if(kwtype in frame && !_isObject(frame[kwtype])) {
    // normalize to array
    var types = frame[kwtype];
    types = _isArray(types) ? types : [types];
    for(var i in types) {
      if(jsonld.hasValue(subject, kwtype, types[i])) {
        rval = true;
        break;
      }
    }
  }
  // check ducktype
  else {
    rval = true;
    var kwid = state.keywords['@id'];
    for(var key in frame) {
      // skip non-@id keywords
      if(key !== kwid && _isKeyword(state.keywords, key)) {
        continue;
      }

      if(!(key in subject)) {
        rval = false;
        break;
      }
    }
  }

  return rval;
}

/**
 * Embeds values for the given subject and property into the given output
 * during the framing algorithm.
 *
 * @param state the current framing state.
 * @param subject the subject.
 * @param property the property.
 * @param output the output.
 */
function _embedValues(state, subject, property, output) {
  var kwid = state.keywords['@id'];
  var kwlist = state.keywords['@list'];

  // normalize to an array
  var objects = subject[property];
  // preserve list
  if(_isListValue(objects, state.keywords)) {
    var list = {};
    list[kwlist] = [];
    jsonld.addValue(output, property, list);
    objects = objects[kwlist];
  }
  objects = _isArray(objects) ? objects : [objects];
  for(var i in objects) {
    var o = objects[i];

    // get subject @id from expanded or compact form
    var sid = null;
    if(_isSubjectReference(o, state.keywords)) {
      sid = o[kwid];
    }
    else if(_isString(o) && _isKeyword(state.keywords,
      jsonld.getContextValue(state.context, property, '@type'), '@id')) {
      sid = o;
    }

    if(sid !== null) {
      // embed full subject if isn't already embedded
      if(!(sid in state.embeds)) {
        // add embed
        var embed = {parent: output, property: property};
        state.embeds[sid] = embed;

        // recurse into subject
        o = {};
        var s = state.subjects[sid];
        for(var prop in s) {
          // copy keywords
          if(_isKeyword(state.keywords, prop)) {
            o[prop] = _clone(s[prop]);
            continue;
          }
          _embedValues(state, s, prop, o);
        }
      }
      _addFrameOutput(state, output, property, o);
    }
    else {
      _addFrameOutput(state, output, property, _clone(o));
    }
  }
}

/**
 * Removes an existing embed.
 *
 * @param state the current framing state.
 * @param id the @id of the embed to remove.
 */
function _removeEmbed(state, id) {
  // get existing embed
  var embeds = state.embeds;
  var embed = embeds[id];
  var parent = embed.parent;
  var property = embed.property;

  // create reference to replace embed
  var subject = {};
  var ref;
  var kwid = state.keywords['@id'];
  if(property !== null && _isKeyword(state.keywords,
    jsonld.getContextValue(state.context, property, '@type'), '@id')) {
    ref = id;
    subject[kwid] = id;
  }
  else {
    ref = {};
    ref[kwid] = id;
    subject[kwid] = id;
  }

  // remove existing embed
  if(_isArray(parent)) {
    // replace subject with reference
    for(var i in parent) {
      if(jsonld.compareValues(parent[i], subject)) {
        parent[i] = ref;
        break;
      }
    }
  }
  else {
    // replace subject with reference
    var useArray = _isArray(parent[property]);
    jsonld.removeValue(parent, property, subject, useArray);
    jsonld.addValue(parent, property, ref, useArray);
  }

  // recursively remove dependent dangling embeds
  var removeDependents = function(id) {
    // get embed keys as a separate array to enable deleting keys in map
    var ids = Object.keys(embeds);
    for(var i in ids) {
      var next = ids[i];
      if(next in embeds && _isObject(embeds[next].parent) &&
        embeds[next].parent[kwid] === id) {
        delete embeds[next];
        removeDependents(next);
      }
    }
  };
  removeDependents(id);
}

/**
 * Adds framing output to the given parent.
 *
 * @param state the current framing state.
 * @param parent the parent to add to.
 * @param property the parent property, null for an array parent.
 * @param output the output to add.
 */
function _addFrameOutput(state, parent, property, output) {
  if(_isObject(parent)) {
    // get keywords
    var kwset = state.keywords['@set'];
    var kwlist = state.keywords['@list'];
    var kwcontainer = state.keywords['@container'];

    // use an array if @container specifies it
    var ctx = state.context;
    var container = jsonld.getContextValue(ctx, property, kwcontainer);
    var useArray = (container === kwset) || (container === kwlist);
    jsonld.addValue(parent, property, output, useArray);
  }
  else {
    parent.push(output);
  }
}

/**
 * Optimally type-compacts a value.
 *
 * @param ctx the current context.
 * @param property the compacted property associated with the value.
 * @param value the value to type-compact.
 * @param optimizeCtx the context used to store optimization definitions.
 *
 * @return the optimally type-compacted value.
 */
function _optimalTypeCompact(ctx, property, value, optimizeCtx) {
  // only arrays and objects can be further optimized
  if(!_isArray(value) && !_isObject(value)) {
    return value;
  }

  // if @type is already in the context, value is already optimized
  if(jsonld.getContextValue(ctx, property, '@type')) {
    return value;
  }

  // if every value is the same type, optimization is possible
  var values = _isArray(value) ? value : [value];
  var type = null;
  for(var i = 0; i < values.length; ++i) {
    // val can only be a subject reference or a @value with no @language
    var val = values[i];
    var vtype = null;
    if(_canTypeCompact(val)) {
      if(_isSubjectReference(val)) {
        vtype = '@id';
      }
      // must be a @value with no @language
      else if('@type' in val) {
        vtype = val['@type'];
      }
    }

    if(i === 0) {
      type = vtype;
    }

    // no type or type difference, can't compact
    if(type === null || !_compareTypes(type, vtype)) {
      return value;
    }
  }

  // all values have same type so can be compacted, add @type to context
  jsonld.setContextValue(optimizeCtx, property, '@type', _clone(type));

  // do compaction
  if(_isArray(value)) {
    for(var i in value) {
      var val = value[i];
      if(_isSubjectReference(value[i])) {
        value[i] = val['@id'];
      }
      else {
        value[i] = val['@value'];
      }
    }
  }
  else if(_isSubjectReference(value)) {
    value = value['@id'];
  }
  else {
    value = value['@value'];
  }

  return value;
}

/**
 * Compacts an IRI into a term or prefix if it can be.
 *
 * @param ctx the context to use.
 * @param iri the IRI to compact.
 *
 * @return the compacted IRI as a term or prefix or the original IRI.
 */
function _compactIri(ctx, iri) {
  // can't compact null
  if(iri === null) {
    return iri;
  }

  // check the context for a term that could shorten the IRI
  // (give preference to terms over prefixes)
  for(var key in ctx) {
    // skip special context keys (start with '@')
    if(key.indexOf('@') === 0) {
      continue;
    }

    // FIXME: there might be more than one choice, choose the most
    // specific definition and if none is more specific, choose
    // the lexicographically least term
    // compact to a term
    if(iri === jsonld.getContextValue(ctx, key, '@id')) {
      return key;
    }
  }

  // term not found, if term is keyword, use alias
  var keywords = _getKeywords(ctx);
  if(iri in keywords) {
    return keywords[iri];
  }

  // term not found, check the context for a prefix
  for(var key in ctx) {
    // skip special context keys (start with '@')
    if(key.indexOf('@') === 0) {
      continue;
    }

    // see if IRI begins with the next IRI from the context
    var ctxIri = jsonld.getContextValue(ctx, key, '@id');
    if(ctxIri !== null) {
      // compact to a prefix
      var idx = iri.indexOf(ctxIri);
      if(idx === 0 && iri.length > ctxIri.length) {
        return key + ':' + iri.substr(ctxIri.length);
      }
    }
  }

  // could not compact IRI, return it as is
  return iri;
}

/**
 * Expands a term into an absolute IRI. The term may be a regular term, a
 * prefix, a relative IRI, or an absolute IRI. In any case, the associated
 * absolute IRI will be returned.
 *
 * @param ctx the context to use.
 * @param term the term to expand.
 * @param deep (used internally to recursively expand).
 *
 * @return the expanded term as an absolute IRI.
 */
function _expandTerm(ctx, term, deep) {
  // default to the term being fully-expanded or not in the context
  var rval = term;

  // 1. If the property has a colon, it is a prefix or an absolute IRI:
  var idx = term.indexOf(':');
  if(idx !== -1) {
    // get the potential prefix
    var prefix = term.substr(0, idx);

    // expand term if prefix is in context, otherwise leave it be
    if(prefix in ctx) {
      // prefix found, expand property to absolute IRI
      var iri = jsonld.getContextValue(ctx, prefix, '@id');
      rval = iri + term.substr(idx + 1);
    }
  }
  // 2. If the property is in the context, then it's a term.
  else if(term in ctx) {
    rval = jsonld.getContextValue(ctx, term, '@id', false);
  }
  // 3. The property is a keyword or not in the context.
  else {
    var keywords = _getKeywords(ctx);
    for(var key in keywords) {
      if(term === keywords[key]) {
        rval = key;
        break;
      }
    }
  }

  // recursively expand the term
  if(_isUndefined(deep)) {
    var cycles = {};
    var recurse = null;
    while(recurse !== rval) {
      if(rval in cycles) {
        throw new JsonLdError(
          'Cyclical term definition detected in context.',
          'jsonld.CyclicalContext',
          {context: ctx, term: rval});
      }
      else {
        cycles[rval] = true;
      }
      recurse = rval;
      recurse = _expandTerm(ctx, recurse, true);
    }
    rval = recurse;
  }

  return rval;
}

/**
 * Gets the keywords from a context.
 *
 * @param ctx the context.
 *
 * @return the keywords.
 */
function _getKeywords(ctx) {
  var rval = {
    '@context': '@context',
    '@container': '@container',
    '@default': '@default',
    '@embed': '@embed',
    '@explicit': '@explicit',
    '@graph': '@graph',
    '@id': '@id',
    '@language': '@language',
    '@list': '@list',
    '@omitDefault': '@omitDefault',
    '@set': '@set',
    '@type': '@type',
    '@value': '@value'
  };

  if(ctx) {
    // gather keyword aliases from context
    var keywords = {};
    for(var key in ctx) {
      if(_isString(ctx[key]) && ctx[key] in rval) {
        if(ctx[key] === '@context') {
          throw new JsonLdError(
            'Invalid JSON-LD syntax; @context cannot be aliased.',
            'jsonld.SyntaxError');
        }
        keywords[ctx[key]] = key;
      }
    }

    // overwrite keywords
    for(var key in keywords) {
      rval[key] = keywords[key];
    }
  }

  return rval;
}

/**
 * Returns whether or not the given value is a keyword (or a keyword alias).
 *
 * @param keywords the map of keyword aliases to check against.
 * @param value the value to check.
 * @param [specific] the specific keyword to check against.
 *
 * @return true if the value is a keyword, false if not.
 */
function _isKeyword(keywords, value, specific) {
  // FIXME: do 'in' on keywords instead
  switch(value) {
  case '@container':
  case '@default':
  case '@embed':
  case '@explicit':
  case '@graph':
  case '@id':
  case '@language':
  case '@list':
  case '@omitDefault':
  case '@set':
  case '@type':
  case '@value':
    return _isUndefined(specific) ? true : (value === specific);
  default:
    for(var key in keywords) {
      if(value === keywords[key]) {
        return _isUndefined(specific) ? true : (key === specific);
      }
    }
  }
  return false;
}

/**
 * Returns true if the given input is an Object.
 *
 * @param input the input to check.
 *
 * @return true if the input is an Object, false if not.
 */
function _isObject(input) {
  return (input && input.constructor === Object);
}

/**
 * Returns true if the given input is an Array.
 *
 * @param input the input to check.
 *
 * @return true if the input is an Array, false if not.
 */
function _isArray(input) {
  return (input && input.constructor === Array);
}

/**
 * Returns true if the given input is a String.
 *
 * @param input the input to check.
 *
 * @return true if the input is a String, false if not.
 */
function _isString(input) {
  return (input && input.constructor === String);
}

/**
 * Returns true if the given input is a Number.
 *
 * @param input the input to check.
 *
 * @return true if the input is a Number, false if not.
 */
function _isNumber(input) {
  return (input && input.constructor === Number);
}

/**
 * Returns true if the given input is a double.
 *
 * @param input the input to check.
 *
 * @return true if the input is a double, false if not.
 */
function _isDouble(input) {
  return _isNumber(input) && String(input).indexOf('.') !== -1;
}

/**
 * Returns true if the given input is a Boolean.
 *
 * @param input the input to check.
 *
 * @return true if the input is a Boolean, false if not.
 */
function _isBoolean(input) {
  return (input && input.constructor === Boolean);
}

/**
 * Returns true if the given input is undefined.
 *
 * @param input the input to check.
 *
 * @return true if the input is undefined, false if not.
 */
function _isUndefined(input) {
  return (typeof input === 'undefined');
}

/**
 * Returns true if the given value is a subject with properties.
 *
 * @param value the value to check.
 * @param [keywords] the keywords map to use.
 *
 * @return true if the value is a subject with properties, false if not.
 */
function _isSubject(value, keywords) {
  var rval = false;

  // Note: A value is a subject if all of these hold true:
  // 1. It is an Object.
  // 2. It is not a @value, @set, or @list.
  // 3. It has more than 1 key OR any existing key is not @id.
  var kwvalue = keywords ? keywords['@value'] : '@value';
  var kwset = keywords ? keywords['@set'] : '@set';
  var kwlist = keywords ? keywords['@list'] : '@list';
  var kwid = keywords ? keywords['@id'] : '@id';
  if(_isObject(value) &&
    !((kwvalue in value) || (kwset in value) || (kwlist in value))) {
    var keyCount = Object.keys(value).length;
    rval = (keyCount > 1 || !(kwid in value));
  }

  return rval;
}

/**
 * Returns true if the given value is a subject reference.
 *
 * @param value the value to check.
 * @param [keywords] the keywords map to use.
 *
 * @return true if the value is a subject reference, false if not.
 */
function _isSubjectReference(value, keywords) {
  // Note: A value is a subject reference if all of these hold true:
  // 1. It is an Object.
  // 2. It has a single key: @id.
  var kwid = keywords ? keywords['@id'] : '@id';
  return _isObject(value) && Object.keys(value).length === 1 && (kwid in value);
}

/**
 * Returns true if the given value is a @value.
 *
 * @param value the value to check.
 * @param [keywords] the keywords map to use.
 *
 * @return true if the value is a @value, false if not.
 */
function _isValue(value, keywords) {
  // Note: A value is a @value if all of these hold true:
  // 1. It is an Object.
  // 2. It has the @value property.
  var kwvalue = keywords ? keywords['@value'] : '@value';
  return _isObject(value) && (kwvalue in value);
}

/**
 * Returns true if the given value is a @set.
 *
 * @param value the value to check.
 * @param [keywords] the keywords map to use.
 *
 * @return true if the value is a @set, false if not.
 */
function _isSetValue(value, keywords) {
  // Note: A value is a @set if all of these hold true:
  // 1. It is an Object.
  // 2. It has the @set property.
  var kwset = keywords ? keywords['@set'] : '@set';
  return _isObject(value) && (kwset in value);
}

/**
 * Returns true if the given value is a @list.
 *
 * @param value the value to check.
 * @param [keywords] the keywords map to use.
 *
 * @return true if the value is a @list, false if not.
 */
function _isListValue(value, keywords) {
  // Note: A value is a @list if all of these hold true:
  // 1. It is an Object.
  // 2. It has the @list property.
  var kwlist = keywords ? keywords['@list'] : '@list';
  return _isObject(value) && (kwlist in value);
}

/**
 * Returns true if the given value is a blank node.
 *
 * @param value the value to check.
 * @param [keywords] the keywords map to use.
 *
 * @return true if the value is a blank node, false if not.
 */
function _isBlankNode(value, keywords) {
  var rval = false;
  // Note: A value is a blank node if all of these hold true:
  // 1. It is an Object.
  // 2. If it has an @id key its value begins with '_:'.
  // 3. It has no keys OR is not a @value, @set, or @list.
  var kwvalue = keywords ? keywords['@value'] : '@value';
  var kwset = keywords ? keywords['@set'] : '@set';
  var kwlist = keywords ? keywords['@list'] : '@list';
  var kwid = keywords ? keywords['@id'] : '@id';
  if(_isObject(value)) {
    if(kwid in value) {
      rval = (value[kwid].indexOf('_:') === 0);
    }
    else {
      rval = (Object.keys(value).length === 0 ||
        !((kwvalue in value) || (kwset in value) || (kwlist in value)));
    }
  }
  return rval;
}

/**
 * Returns true if the given value can be possibly compacted based on type.
 *
 * Subject references and @values can be possibly compacted, however, a @value
 * must not have a @language or type-compaction would cause data loss.
 *
 * @param value the value to check.
 *
 * @return true if the value can be possibly type-compacted, false if not.
 */
function _canTypeCompact(value) {
  // Note: It may be possible to type-compact a value if all these hold true:
  // 1. It is an Object.
  // 2. It is a subject reference OR a @value with no @language.
  return (_isObject(value) && (_isSubjectReference(value) ||
    (_isValue(value) && !('@language' in value))));
}

/**
 * Compares types for equality. The given types can be arrays or strings, and
 * it is assumed that they are all in the same expanded/compacted state. If
 * both types are the same or, in the case of arrays of types, if both type
 * arrays contain the same types, they are equal.
 *
 * @param type1 the first type(s) to compare.
 * @param type2 the second types(s) to compare.
 *
 * @return true if the types are equal, false if not.
 */
function _compareTypes(type1, type2) {
  // normalize to arrays
  type1 = _isArray(type1) ? type1.sort() : [type1];
  type2 = _isArray(type2) ? type2.sort() : [type2];

  if(type1.length !== type2.length) {
    return false;
  }

  for(var i in type1) {
    if(type1[i] !== type2[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Returns true if the given value is an absolute IRI, false if not.
 *
 * @param value the value to check.
 *
 * @return true if the value is an absolute IRI, false if not.
 */
function _isAbsoluteIri(value) {
  return /(\w+):\/\/(.+)/.test(value);
}

/**
 * Clones an object, array, or string/number.
 *
 * @param value the value to clone.
 *
 * @return the cloned value.
 */
function _clone(value) {
  var rval;

  if(_isObject(value)) {
    rval = {};
    for(var key in value) {
      rval[key] = _clone(value[key]);
    }
  }
  else if(_isArray(value)) {
    rval = [];
    for(var i in value) {
      rval[i] = _clone(value[i]);
    }
  }
  else {
    rval = value;
  }

  return rval;
}

/**
 * Resolves external @context URLs using the given URL resolver. Each instance
 * of @context in the input that refers to a URL will be replaced with the
 * JSON @context found at that URL.
 *
 * @param input the JSON-LD object with possible contexts.
 * @param resolver(url, callback(err, jsonCtx)) the URL resolver to use.
 * @param callback(err, input) called once the operation completes.
 */
function _resolveUrls(input, resolver, callback) {
  // keeps track of resolved URLs (prevents duplicate work)
  var urls = {};

  // finds URLs in @context properties and replaces them with their
  // resolved @contexts if replace is true
  var findUrls = function(input, replace) {
    if(_isArray(input)) {
      for(var i in input) {
        findUrls(input[i], replace);
      }
    }
    else if(_isObject(input)) {
      for(var key in input) {
        if(key !== '@context') {
          continue;
        }

        // get @context
        var ctx = input[key];

        // array @context
        if(_isArray(ctx)) {
          for(var i in ctx) {
            if(_isString(ctx[i])) {
              // replace w/resolved @context if requested
              if(replace) {
                ctx[i] = urls[ctx[i]];
              }
              // unresolved @context found
              else {
                urls[ctx[i]] = {};
              }
            }
          }
        }
        // string @context
        else if(_isString(ctx)) {
          // replace w/resolved @context if requested
          if(replace) {
            input[key] = urls[ctx];
          }
          // unresolved @context found
          else {
            urls[ctx] = {};
          }
        }
      }
    }
  };
  findUrls(input, false);

  // state for resolving URLs
  var count = Object.keys(urls).length;
  var errors = [];

  // called once finished resolving URLs
  var finished = function() {
    if(errors.length > 0) {
      callback(new JsonLdError(
        'Could not resolve @context URL(s).',
        'jsonld.ContextUrlError',
        {errors: errors}));
    }
    else {
      callback(null, input);
    }
  };

  // nothing to resolve
  if(count === 0) {
    return finished();
  }

  // resolve all URLs
  for(var url in urls) {
    // validate URL
    var regex = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    if(!regex.test(url)) {
      count -= 1;
      errors.push(new JsonLdError(
        'Malformed URL.', 'jsonld.InvalidUrl', {url: url}));
      continue;
    }

    // resolve URL
    resolver(url, function(err, ctx) {
      count -= 1;

      // parse string context as JSON
      if(!err && _isString(ctx)) {
        try {
          ctx = JSON.parse(ctx);
        }
        catch(ex) {
          err = ex;
        }
      }

      // ensure ctx is an object
      if(!err && !_isObject(ctx)) {
        err = new JsonLdError(
          'URL does not resolve to a valid JSON-LD object.',
          'jsonld.InvalidUrl', {url: url});
      }

      if(err) {
        errors.push(err);
      }
      else {
        urls[url] = ctx['@context'] || {};
      }

      if(count === 0) {
        // if no errors, do URL replacement
        if(errors.length === 0) {
          findUrls(input, true);
        }
        finished();
      }
    });
  }
}

// define js 1.8.5 Object.keys method if not present
if(!Object.keys) {
  Object.keys = function(o) {
    if(o !== Object(o)) {
      throw new TypeError('Object.keys called on non-object');
    }
    var rval = [];
    for(var p in o) {
      if(Object.prototype.hasOwnProperty.call(o, p)) {
        rval.push(p);
      }
    }
    return rval;
  };
}

/**
 * Creates a new UniqueNamer. A UniqueNamer issues unique names, keeping
 * track of any previously issued names.
 *
 * @param prefix the prefix to use ('<prefix><counter>').
 */
var UniqueNamer = function(prefix) {
  this.prefix = prefix;
  this.counter = 0;
  this.existing = {};
};

/**
 * Copies this UniqueNamer.
 *
 * @return a copy of this UniqueNamer.
 */
UniqueNamer.prototype.clone = function() {
  var copy = new UniqueNamer(this.prefix);
  copy.counter = this.counter;
  copy.existing = _clone(this.existing);
  return copy;
};

/**
 * Gets the new name for the given old name, where if no old name is given
 * a new name will be generated.
 *
 * @param [oldName] the old name to get the new name for.
 *
 * @return the new name.
 */
UniqueNamer.prototype.getName = function(oldName) {
  // return existing old name
  if(oldName && oldName in this.existing) {
    return this.existing[oldName];
  }

  // get next name
  var name = this.prefix + this.counter;
  this.counter += 1;

  // save mapping
  if(oldName) {
    this.existing[oldName] = name;
  }
  else {
    this.existing[name] = name;
  }

  return name;
};

/**
 * Returns true if the given oldName has already been assigned a new name.
 *
 * @param oldName the oldName to check.
 *
 * @return true if the oldName has been assigned a new name, false if not.
 */
UniqueNamer.prototype.isNamed = function(oldName) {
  return (oldName in this.existing);
};

/**
 * A Permutator iterates over all possible permutations of the given array
 * of elements.
 *
 * @param list the array of elements to iterate over.
 */
Permutator = function(list) {
  // original array
  this.list = list.sort();
  // indicates whether there are more permutations
  this.done = false;
  // directional info for permutation algorithm
  this.left = {};
  for(var i in list) {
    this.left[list[i]] = true;
  }
};

/**
 * Returns true if there is another permutation.
 *
 * @return true if there is another permutation, false if not.
 */
Permutator.prototype.hasNext = function() {
  return !this.done;
};

/**
 * Gets the next permutation. Call hasNext() to ensure there is another one
 * first.
 *
 * @return the next permutation.
 */
Permutator.prototype.next = function() {
  // copy current permutation
  var rval = this.list.slice();

  /* Calculate the next permutation using the Steinhaus-Johnson-Trotter
   permutation algorithm. */

  // get largest mobile element k
  // (mobile: element is greater than the one it is looking at)
  var k = null;
  var pos = 0;
  var length = this.list.length;
  for(var i = 0; i < length; ++i) {
    var element = this.list[i];
    var left = this.left[element];
    if((k === null || element > k) &&
      ((left && i > 0 && element > this.list[i - 1]) ||
      (!left && i < (length - 1) && element > this.list[i + 1]))) {
      k = element;
      pos = i;
    }
  }

  // no more permutations
  if(k === null) {
    this.done = true;
  }
  else {
    // swap k and the element it is looking at
    var swap = this.left[k] ? pos - 1 : pos + 1;
    this.list[pos] = this.list[swap];
    this.list[swap] = k;

    // reverse the direction of all elements larger than k
    for(var i = 0; i < length; ++i) {
      if(this.list[i] > k) {
        this.left[this.list[i]] = !this.left[this.list[i]];
      }
    }
  }

  return rval;
};

// SHA-1 API
var sha1 = jsonld.sha1 = {};

if(_nodejs) {
  var crypto = require('crypto');
  sha1.create = function() {
    var md = crypto.createHash('sha1');
    return {
      update: function(data) {
        md.update(data, 'utf8');
      },
      digest: function() {
        return md.digest('hex');
      }
    };
  };
}
else {
  sha1.create = function() {
    return new sha1.MessageDigest();
  };
}

/**
 * Hashes the given array of triples and returns its hexadecimal SHA-1 message
 * digest.
 *
 * @param triples the list of serialized triples to hash.
 *
 * @return the hexadecimal SHA-1 message digest.
 */
sha1.hash = function(triples) {
  var md = sha1.create();
  for(var i in triples) {
    md.update(triples[i]);
  }
  return md.digest();
};

// only define sha1 MessageDigest for non-nodejs
if(!_nodejs) {

/**
 * Creates a simple byte buffer for message digest operations.
 */
sha1.Buffer = function() {
  this.data = '';
  this.read = 0;
};

/**
 * Puts a 32-bit integer into this buffer in big-endian order.
 *
 * @param i the 32-bit integer.
 */
sha1.Buffer.prototype.putInt32 = function(i) {
  this.data += (
    String.fromCharCode(i >> 24 & 0xFF) +
    String.fromCharCode(i >> 16 & 0xFF) +
    String.fromCharCode(i >> 8 & 0xFF) +
    String.fromCharCode(i & 0xFF));
};

/**
 * Gets a 32-bit integer from this buffer in big-endian order and
 * advances the read pointer by 4.
 *
 * @return the word.
 */
sha1.Buffer.prototype.getInt32 = function() {
  var rval = (
    this.data.charCodeAt(this.read) << 24 ^
    this.data.charCodeAt(this.read + 1) << 16 ^
    this.data.charCodeAt(this.read + 2) << 8 ^
    this.data.charCodeAt(this.read + 3));
  this.read += 4;
  return rval;
};

/**
 * Gets the bytes in this buffer.
 *
 * @return a string full of UTF-8 encoded characters.
 */
sha1.Buffer.prototype.bytes = function() {
  return this.data.slice(this.read);
};

/**
 * Gets the number of bytes in this buffer.
 *
 * @return the number of bytes in this buffer.
 */
sha1.Buffer.prototype.length = function() {
  return this.data.length - this.read;
};

/**
 * Compacts this buffer.
 */
sha1.Buffer.prototype.compact = function() {
  this.data = this.data.slice(this.read);
  this.read = 0;
};

/**
 * Converts this buffer to a hexadecimal string.
 *
 * @return a hexadecimal string.
 */
sha1.Buffer.prototype.toHex = function() {
  var rval = '';
  for(var i = this.read; i < this.data.length; ++i) {
    var b = this.data.charCodeAt(i);
    if(b < 16) {
      rval += '0';
    }
    rval += b.toString(16);
  }
  return rval;
};

/**
 * Creates a SHA-1 message digest object.
 *
 * @return a message digest object.
 */
sha1.MessageDigest = function() {
  // do initialization as necessary
  if(!_sha1.initialized) {
    _sha1.init();
  }

  this.blockLength = 64;
  this.digestLength = 20;
  // length of message so far (does not including padding)
  this.messageLength = 0;

  // input buffer
  this.input = new sha1.Buffer();

  // for storing words in the SHA-1 algorithm
  this.words = new Array(80);

  // SHA-1 state contains five 32-bit integers
  this.state = {
    h0: 0x67452301,
    h1: 0xEFCDAB89,
    h2: 0x98BADCFE,
    h3: 0x10325476,
    h4: 0xC3D2E1F0
  };
};

/**
 * Updates the digest with the given string input.
 *
 * @param msg the message input to update with.
 */
sha1.MessageDigest.prototype.update = function(msg) {
  // UTF-8 encode message
  msg = unescape(encodeURIComponent(msg));

  // update message length and input buffer
  this.messageLength += msg.length;
  this.input.data += msg;

  // process input
  _sha1.update(this.state, this.words, this.input);

  // compact input buffer every 2K or if empty
  if(this.input.read > 2048 || this.input.length() === 0) {
    this.input.compact();
  }
};

/**
 * Produces the digest.
 *
 * @return the digest as a hexadecimal string.
 */
sha1.MessageDigest.prototype.digest = function() {
  /* Determine the number of bytes that must be added to the message
  to ensure its length is congruent to 448 mod 512. In other words,
  a 64-bit integer that gives the length of the message will be
  appended to the message and whatever the length of the message is
  plus 64 bits must be a multiple of 512. So the length of the
  message must be congruent to 448 mod 512 because 512 - 64 = 448.

  In order to fill up the message length it must be filled with
  padding that begins with 1 bit followed by all 0 bits. Padding
  must *always* be present, so if the message length is already
  congruent to 448 mod 512, then 512 padding bits must be added. */

  // 512 bits == 64 bytes, 448 bits == 56 bytes, 64 bits = 8 bytes
  // _padding starts with 1 byte with first bit is set in it which
  // is byte value 128, then there may be up to 63 other pad bytes
  var len = this.messageLength;
  var padBytes = new sha1.Buffer();
  padBytes.data += this.input.bytes();
  padBytes.data += _sha1.padding.substr(0, 64 - ((len + 8) % 64));

  /* Now append length of the message. The length is appended in bits
  as a 64-bit number in big-endian order. Since we store the length
  in bytes, we must multiply it by 8 (or left shift by 3). So here
  store the high 3 bits in the low end of the first 32-bits of the
  64-bit number and the lower 5 bits in the high end of the second
  32-bits. */
  padBytes.putInt32((len >>> 29) & 0xFF);
  padBytes.putInt32((len << 3) & 0xFFFFFFFF);
  _sha1.update(this.state, this.words, padBytes);
  var rval = new sha1.Buffer();
  rval.putInt32(this.state.h0);
  rval.putInt32(this.state.h1);
  rval.putInt32(this.state.h2);
  rval.putInt32(this.state.h3);
  rval.putInt32(this.state.h4);
  return rval.toHex();
};

// private SHA-1 data
var _sha1 = {
  padding: null,
  initialized: false
};

/**
 * Initializes the constant tables.
 */
_sha1.init = function() {
  // create padding
  _sha1.padding = String.fromCharCode(128);
  var c = String.fromCharCode(0x00);
  var n = 64;
  while(n > 0) {
    if(n & 1) {
      _sha1.padding += c;
    }
    n >>>= 1;
    if(n > 0) {
      c += c;
    }
  }

  // now initialized
  _sha1.initialized = true;
};

/**
 * Updates a SHA-1 state with the given byte buffer.
 *
 * @param s the SHA-1 state to update.
 * @param w the array to use to store words.
 * @param input the input byte buffer.
 */
_sha1.update = function(s, w, input) {
  // consume 512 bit (64 byte) chunks
  var t, a, b, c, d, e, f, i;
  var len = input.length();
  while(len >= 64) {
    // the w array will be populated with sixteen 32-bit big-endian words
    // and then extended into 80 32-bit words according to SHA-1 algorithm
    // and for 32-79 using Max Locktyukhin's optimization

    // initialize hash value for this chunk
    a = s.h0;
    b = s.h1;
    c = s.h2;
    d = s.h3;
    e = s.h4;

    // round 1
    for(i = 0; i < 16; ++i) {
      t = input.getInt32();
      w[i] = t;
      f = d ^ (b & (c ^ d));
      t = ((a << 5) | (a >>> 27)) + f + e + 0x5A827999 + t;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = t;
    }
    for(; i < 20; ++i) {
      t = (w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]);
      t = (t << 1) | (t >>> 31);
      w[i] = t;
      f = d ^ (b & (c ^ d));
      t = ((a << 5) | (a >>> 27)) + f + e + 0x5A827999 + t;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = t;
    }
    // round 2
    for(; i < 32; ++i) {
      t = (w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]);
      t = (t << 1) | (t >>> 31);
      w[i] = t;
      f = b ^ c ^ d;
      t = ((a << 5) | (a >>> 27)) + f + e + 0x6ED9EBA1 + t;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = t;
    }
    for(; i < 40; ++i) {
      t = (w[i - 6] ^ w[i - 16] ^ w[i - 28] ^ w[i - 32]);
      t = (t << 2) | (t >>> 30);
      w[i] = t;
      f = b ^ c ^ d;
      t = ((a << 5) | (a >>> 27)) + f + e + 0x6ED9EBA1 + t;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = t;
    }
    // round 3
    for(; i < 60; ++i) {
      t = (w[i - 6] ^ w[i - 16] ^ w[i - 28] ^ w[i - 32]);
      t = (t << 2) | (t >>> 30);
      w[i] = t;
      f = (b & c) | (d & (b ^ c));
      t = ((a << 5) | (a >>> 27)) + f + e + 0x8F1BBCDC + t;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = t;
    }
    // round 4
    for(; i < 80; ++i) {
      t = (w[i - 6] ^ w[i - 16] ^ w[i - 28] ^ w[i - 32]);
      t = (t << 2) | (t >>> 30);
      w[i] = t;
      f = b ^ c ^ d;
      t = ((a << 5) | (a >>> 27)) + f + e + 0xCA62C1D6 + t;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = t;
    }

    // update hash state
    s.h0 += a;
    s.h1 += b;
    s.h2 += c;
    s.h3 += d;
    s.h4 += e;

    len -= 64;
  }
};

} // end non-nodejs

})();
