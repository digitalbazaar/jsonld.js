/**
 * A JavaScript implementation of the JSON-LD API.
 *
 * @author Dave Longley
 *
 * BSD 3-Clause License
 * Copyright (c) 2011-2012 Digital Bazaar, Inc.
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

// define jsonld API
var jsonld = {};

/* Core API */

/**
 * Performs JSON-LD compaction.
 *
 * @param input the JSON-LD object to compact.
 * @param ctx the context to compact with.
 * @param [options] options to use:
 *          [base] the base IRI to use.
 *          [strict] use strict mode (default: true).
 *          [optimize] true to optimize the compaction (default: false).
 *          [graph] true to always output a top-level graph (default: false).
 *          [resolver(url, callback(err, jsonCtx))] the URL resolver to use.
 * @param callback(err, compacted, ctx) called once the operation completes.
 */
jsonld.compact = function(input, ctx) {
  // get arguments
  var options = {};
  var callbackArg = 2;
  if(arguments.length > 3) {
    options = arguments[2] || {};
    callbackArg += 1;
  }
  var callback = arguments[callbackArg];

  // nothing to compact
  if(input === null) {
    return callback(null, null);
  }

  // set default options
  if(!('base' in options)) {
    options.base = '';
  }
  if(!('strict' in options)) {
    options.strict = true;
  }
  if(!('optimize') in options) {
    options.optimize = false;
  }
  if(!('graph') in options) {
    options.graph = false;
  }
  if(!('resolver') in options) {
    options.resolver = jsonld.urlResolver;
  }

  // expand input then do compaction
  jsonld.expand(input, options, function(err, expanded) {
    if(err) {
      return callback(new JsonLdError(
        'Could not expand input before compaction.',
        'jsonld.CompactError', {cause: err}));
    }

    // process context
    var activeCtx = _getInitialContext();
    jsonld.processContext(activeCtx, ctx, options, function(err, activeCtx) {
      if(err) {
        return callback(new JsonLdError(
          'Could not process context before compaction.',
          'jsonld.CompactError', {cause: err}));
      }

      try {
        // create optimize context
        if(options.optimize) {
          options.optimizeCtx = {};
        }

        // do compaction
        input = expanded;
        var compacted = new Processor().compact(
          activeCtx, null, input, options);
        cleanup(null, compacted, activeCtx, options);
      }
      catch(ex) {
        callback(ex);
      }
    });
  });

  // performs clean up after compaction
  function cleanup(err, compacted, activeCtx, options) {
    if(err) {
      return callback(err);
    }

    // if compacted is an array with 1 entry, remove array unless
    // graph option is set
    if(!options.graph && _isArray(compacted) && compacted.length === 1) {
      compacted = compacted[0];
    }
    // always use array if graph option is on
    else if(options.graph && _isObject(compacted)) {
      compacted = [compacted];
    }

    // build output context
    ctx = _clone(ctx);
    if(!_isArray(ctx)) {
      ctx = [ctx];
    }
    // add optimize context
    if(options.optimizeCtx) {
      ctx.push(options.optimizeCtx);
    }
    // remove empty contexts
    var tmp = ctx;
    ctx = [];
    for(var i in tmp) {
      if(!_isObject(tmp[i]) || Object.keys(tmp[i]).length > 0) {
        ctx.push(tmp[i]);
      }
    }

    // remove array if only one context
    var hasContext = (ctx.length > 0);
    if(ctx.length === 1) {
      ctx = ctx[0];
    }

    // add context
    if(hasContext || options.graph) {
      if(_isArray(compacted)) {
        // use '@graph' keyword
        var kwgraph = _compactIri(activeCtx, '@graph');
        var graph = compacted;
        compacted = {};
        if(hasContext) {
          compacted['@context'] = ctx;
        }
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

    callback(null, compacted, activeCtx);
  };
};

/**
 * Performs JSON-LD expansion.
 *
 * @param input the JSON-LD object to expand.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [resolver(url, callback(err, jsonCtx))] the URL resolver to use.
 * @param callback(err, expanded) called once the operation completes.
 */
jsonld.expand = function(input) {
  // get arguments
  var options = {};
  var callback;
  var callbackArg = 1;
  if(arguments.length > 2) {
    options = arguments[1] || {};
    callbackArg += 1;
  }
  callback = arguments[callbackArg];

  // set default options
  if(!('base' in options)) {
    options.base = '';
  }
  if(!('resolver' in options)) {
    options.resolver = jsonld.urlResolver;
  }

  // resolve all @context URLs in the input
  input = _clone(input);
  _resolveUrls(input, options.resolver, function(err, input) {
    if(err) {
      return callback(err);
    }
    try {
      // do expansion
      var ctx = _getInitialContext();
      var expanded = new Processor().expand(ctx, null, input, options, false);

      // optimize away @graph with no other properties
      if(_isObject(expanded) && ('@graph' in expanded) &&
        Object.keys(expanded).length === 1) {
        expanded = expanded['@graph'];
      }
      // normalize to an array
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
 *          [base] the base IRI to use.
 *          [embed] default @embed flag (default: true).
 *          [explicit] default @explicit flag (default: false).
 *          [omitDefault] default @omitDefault flag (default: false).
 *          [optimize] optimize when compacting (default: false).
 *          [resolver(url, callback(err, jsonCtx))] the URL resolver to use.
 * @param callback(err, framed) called once the operation completes.
 */
jsonld.frame = function(input, frame) {
  // get arguments
  var options = {};
  var callbackArg = 2;
  if(arguments.length > 3) {
    options = arguments[2] || {};
    callbackArg += 1;
  }
  var callback = arguments[callbackArg];

  // set default options
  if(!('base' in options)) {
    options.base = '';
  }
  if(!('resolver' in options)) {
    options.resolver = jsonld.urlResolver;
  }
  if(!('embed' in options)) {
    options.embed = true;
  }
  options.explicit = options.explicit || false;
  options.omitDefault = options.omitDefault || false;
  options.optimize = options.optimize || false;

  // preserve frame context
  var ctx = frame['@context'] || {};

  // expand input
  jsonld.expand(input, options, function(err, _input) {
    if(err) {
      return callback(new JsonLdError(
        'Could not expand input before framing.',
        'jsonld.FrameError', {cause: err}));
    }

    // expand frame
    jsonld.expand(frame, options, function(err, _frame) {
      if(err) {
        return callback(new JsonLdError(
          'Could not expand frame before framing.',
          'jsonld.FrameError', {cause: err}));
      }

      try {
        // do framing
        var framed = new Processor().frame(_input, _frame, options);
      }
      catch(ex) {
        callback(ex);
      }

      // compact result (force @graph option to true)
      options.graph = true;
      jsonld.compact(framed, ctx, options, function(err, compacted, ctx) {
        if(err) {
          return callback(new JsonLdError(
            'Could not compact framed output.',
            'jsonld.FrameError', {cause: err}));
        }
        // get graph alias
        var graph = _compactIri(ctx, '@graph');
        // remove @preserve from results
        compacted[graph] = _removePreserve(ctx, compacted[graph]);
        callback(null, compacted);
      });
    });
  });
};

/**
 * Performs JSON-LD normalization.
 *
 * @param input the JSON-LD object to normalize.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [resolver(url, callback(err, jsonCtx))] the URL resolver to use.
 * @param callback(err, normalized) called once the operation completes.
 */
jsonld.normalize = function(input, callback) {
  // get arguments
  var options = {};
  var callback;
  var callbackArg = 1;
  if(arguments.length > 2) {
    options = arguments[1] || {};
    callbackArg += 1;
  }
  callback = arguments[callbackArg];

  // set default options
  if(!('base' in options)) {
    options.base = '';
  }
  if(!('resolver' in options)) {
    options.resolver = jsonld.urlResolver;
  }

  // expand input then do normalization
  jsonld.expand(input, options, function(err, expanded) {
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
 * Outputs the RDF statements found in the given JSON-LD object.
 *
 * @param input the JSON-LD object.
 * @param [options] the options to use:
 *          [resolver(url, callback(err, jsonCtx))] the URL resolver to use.
 * @param callback(err, statement) called when a statement is output, with the
 *          last statement as null.
 */
jsonld.toRDF = function(input, callback) {
  // get arguments
  var options = {};
  var callback;
  var callbackArg = 1;
  if(arguments.length > 2) {
    options = arguments[1] || {};
    callbackArg += 1;
  }
  callback = arguments[callbackArg];

  // set default options
  if(!('base' in options)) {
    options.base = '';
  }
  if(!('resolver' in options)) {
    options.resolver = jsonld.urlResolver;
  }

  // resolve all @context URLs in the input
  input = _clone(input);
  _resolveUrls(input, options.resolver, function(err, input) {
    if(err) {
      return callback(err);
    }
    // output RDF statements
    return new Processor().toRDF(input, callback);
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
 * Processes a local context, resolving any URLs as necessary, and returns a
 * new active context in its callback.
 *
 * @param activeCtx the current active context.
 * @param localCtx the local context to process.
 * @param [options] the options to use:
 *          [resolver(url, callback(err, jsonCtx))] the URL resolver to use.
 * @param callback(err, ctx) called once the operation completes.
 */
jsonld.processContext = function(activeCtx, localCtx) {
  // return initial context early for null context
  if(localCtx === null) {
    return callback(null, _getInitialContext());
  }

  // get arguments
  var options = {};
  var callbackArg = 2;
  if(arguments.length > 3) {
    options = arguments[2] || {};
    callbackArg += 1;
  }
  var callback = arguments[callbackArg];

  // set default options
  if(!('base' in options)) {
    options.base = '';
  }
  if(!('resolver' in options)) {
    options.resolver = jsonld.urlResolver;
  }

  // resolve URLs in localCtx
  localCtx = _clone(localCtx);
  if(_isObject(localCtx) && !('@context' in localCtx)) {
    localCtx = {'@context': localCtx};
  }
  _resolveUrls(localCtx, options.resolver, function(err, ctx) {
    if(err) {
      return callback(err);
    }
    try {
      // process context
      ctx = new Processor().processContext(activeCtx, ctx, options);
      callback(null, ctx);
    }
    catch(ex) {
      callback(ex);
    }
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
    if(value.length === 0 && propertyIsArray && !(property in subject)) {
      subject[property] = [];
    }
    for(var i in value) {
      jsonld.addValue(subject, property, value[i], propertyIsArray);
    }
  }
  else if(property in subject) {
    var hasValue = jsonld.hasValue(subject, property, value);

    // make property an array if value not present or always an array
    if(!_isArray(subject[property]) && (!hasValue || propertyIsArray)) {
      subject[property] = [subject[property]];
    }

    // add new value
    if(!hasValue) {
      subject[property].push(value);
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
jsonld.getContextValue = function(ctx, key, type) {
  var rval = null;

  // return null for invalid key
  if(key === null) {
    return rval;
  }

  // get default language
  if(type === '@language' && (type in ctx)) {
    rval = ctx[type];
  }

  // get specific entry information
  if(key in ctx.mappings) {
    var entry = ctx.mappings[key];

    // return whole entry
    if(_isUndefined(type)) {
      rval = entry;
    }
    // return entry value for type
    else if(type in entry) {
      rval = entry[type];
    }
  }

  return rval;
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
 * Recursively compacts an element using the given active context. All values
 * must be in expanded form before this method is called.
 *
 * @param ctx the active context to use.
 * @param property the property that points to the element, null for none.
 * @param element the element to compact.
 * @param options the compaction options.
 *
 * @return the compacted value.
 */
Processor.prototype.compact = function(ctx, property, element, options) {
  // recursively compact array
  if(_isArray(element)) {
    var rval = [];
    for(var i in element) {
      var e = this.compact(ctx, property, element[i], options);
      // drop null values
      if(e !== null) {
        rval.push(e);
      }
    }
    if(rval.length === 1) {
      // use single element if no container is specified
      var container = jsonld.getContextValue(ctx, property, '@container');
      if(container !== '@list' && container !== '@set') {
        rval = rval[0];
      }
    }
    return rval;
  }

  // recursively compact object
  if(_isObject(element)) {
    // element is a @value
    if(_isValue(element)) {
      var type = jsonld.getContextValue(ctx, property, '@type');
      var language = jsonld.getContextValue(ctx, property, '@language');

      // matching @type specified in context, compact element
      if(type !== null &&
        ('@type' in element) && element['@type'] === type) {
        element = element['@value'];

        // use native datatypes for certain xsd types
        if(type === XSD['boolean']) {
          element = !(element === 'false' || element === '0');
        }
        else if(type === XSD['integer']) {
          element = parseInt(element);
        }
        else if(type === XSD['double']) {
          element = parseFloat(element);
        }
      }
      // matching @language specified in context, compact element
      else if(language !== null &&
        ('@language' in element) && element['@language'] === language) {
        element = element['@value'];
      }
      // compact @type IRI
      else if('@type' in element) {
        element['@type'] = _compactIri(ctx, element['@type']);
      }
      return element;
    }

    // compact subject references
    if(_isSubjectReference(element)) {
      var type = jsonld.getContextValue(ctx, property, '@type');
      if(type === '@id') {
        element = _compactIri(ctx, element['@id']);
        return element;
      }
    }

    // recursively process element keys
    var rval = {};
    for(var key in element) {
      var value = element[key];

      // compact @id and @type(s)
      if(key === '@id' || key === '@type') {
        // compact single @id
        if(_isString(value)) {
          value = _compactIri(ctx, value);
        }
        // value must be a @type array
        else {
          var types = [];
          for(var i in value) {
            types.push(_compactIri(ctx, value[i]));
          }
          value = types;
        }

        // compact property and add value
        var prop = _compactIri(ctx, key);
        var isArray = (_isArray(value) && value.length === 0);
        jsonld.addValue(rval, prop, value, isArray);
        continue;
      }

      // Note: value must be an array due to expansion algorithm.

      // preserve empty arrays
      if(value.length === 0) {
        var prop = _compactIri(ctx, key);
        jsonld.addValue(rval, prop, [], true);
      }

      // recusively process array values
      for(var i in value) {
        var v = value[i];
        var isList = _isListValue(v);

        // compact property
        var prop = _compactIri(ctx, key, v);

        // remove @list for recursion (will be re-added if necessary)
        if(isList) {
          v = v['@list'];
        }

        // recursively compact value
        v = this.compact(ctx, prop, v, options);

        // get container type for property
        var container = jsonld.getContextValue(ctx, prop, '@container');

        // handle @list
        if(isList && container !== '@list') {
          // handle messy @list compaction
          if(prop in rval && options.strict) {
            throw new JsonLdError(
              'JSON-LD compact error; property has a "@list" @container ' +
              'rule but there is more than a single @list that matches ' +
              'the compacted term in the document. Compaction might mix ' +
              'unwanted items into the list.',
              'jsonld.SyntaxError');
          }
          // reintroduce @list keyword
          var kwlist = _compactIri(ctx, '@list');
          var val = {};
          val[kwlist] = v;
          v = val;
        }

        // if @container is @set or @list or value is an empty array, use
        // an array when adding value
        var isArray = (container === '@set' || container === '@list' ||
          (_isArray(v) && v.length === 0));

        // add compact value
        jsonld.addValue(rval, prop, v, isArray);
      }
    }
    return rval;
  }

  // only primitives remain which are already compact
  return element;
};

/**
 * Recursively expands an element using the given context. Any context in
 * the element will be removed. All context URLs must have been resolved
 * before calling this method.
 *
 * @param ctx the context to use.
 * @param property the property for the element, null for none.
 * @param element the element to expand.
 * @param options the expansion options.
 * @param propertyIsList true if the property is a list, false if not.
 *
 * @return the expanded value.
 */
Processor.prototype.expand = function(
  ctx, property, element, options, propertyIsList) {
  // recursively expand array
  if(_isArray(element)) {
    var rval = [];
    for(var i in element) {
      // expand element
      var e = this.expand(ctx, property, element[i], options, propertyIsList);
      if(_isArray(e) && propertyIsList) {
        // lists of lists are illegal
        throw new JsonLdError(
          'Invalid JSON-LD syntax; lists of lists are not permitted.',
          'jsonld.SyntaxError');
      }
      // drop null values
      else if(e !== null) {
        rval.push(e);
      }
    }
    return rval;
  }

  // recursively expand object
  if(_isObject(element)) {
    // if element has a context, process it
    if('@context' in element) {
      ctx = this.processContext(ctx, element['@context'], options);
      delete element['@context'];
    }

    var rval = {};
    for(var key in element) {
      // expand property
      var prop = _expandTerm(ctx, key);

      // drop non-absolute IRI keys that aren't keywords
      if(!_isAbsoluteIri(prop) && !_isKeyword(prop, ctx)) {
        continue;
      }

      // if value is null and property is not @value, continue
      var value = element[key];
      if(value === null && prop !== '@value') {
        continue;
      }

      // syntax error if @id is not a string
      if(prop === '@id' && !_isString(value)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; "@id" value must a string.',
          'jsonld.SyntaxError', {value: value});
      }

      // @type must be a string, array of strings, or an empty JSON object
      if(prop === '@type' &&
        !(_isString(value) || _isArrayOfStrings(value) ||
        _isEmptyObject(value))) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; "@type" value must a string, an array ' +
          'of strings, or an empty object.',
          'jsonld.SyntaxError', {value: value});
      }

      // @graph must be an array or an object
      if(prop === '@graph' && !(_isObject(value) || _isArray(value))) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; "@value" value must not be an ' +
          'object or an array.',
          'jsonld.SyntaxError', {value: value});
      }

      // @value must not be an object or an array
      if(prop === '@value' && (_isObject(value) || _isArray(value))) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; "@value" value must not be an ' +
          'object or an array.',
          'jsonld.SyntaxError', {value: value});
      }

      // @language must be a string
      if(prop === '@language' && !_isString(value)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; "@language" value must not be a string.',
          'jsonld.SyntaxError', {value: value});
      }

      // recurse into @list, @set, or @graph, keeping the active property
      var isList = (prop === '@list');
      if(isList || prop === '@set' || prop === '@graph') {
        value = this.expand(ctx, property, value, options, isList);
        if(isList && _isListValue(value)) {
          throw new JsonLdError(
            'Invalid JSON-LD syntax; lists of lists are not permitted.',
            'jsonld.SyntaxError');
        }
      }
      else {
        // update active property and recursively expand value
        property = key;
        value = this.expand(ctx, property, value, options, false);
      }

      // drop null values if property is not @value (dropped below)
      if(value !== null || prop === '@value') {
        // convert value to @list if container specifies it
        if(prop !== '@list' && !_isListValue(value)) {
          var container = jsonld.getContextValue(ctx, property, '@container');
          if(container === '@list') {
            // ensure value is an array
            value = _isArray(value) ? value : [value];
            value = {'@list': value};
          }
        }

        // add value, use an array if not @id, @type, @value, or @language
        var useArray = !(prop === '@id' || prop === '@type' ||
          prop === '@value' || prop === '@language');
        jsonld.addValue(rval, prop, value, useArray);
      }
    }

    // get property count on expanded output
    var count = Object.keys(rval).length;

    // @value must only have @language or @type
    if('@value' in rval) {
      if((count === 2 && !('@type' in rval) && !('@language' in rval)) ||
        count > 2) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; an element containing "@value" must have ' +
          'at most one other property which can be "@type" or "@language".',
          'jsonld.SyntaxError', {element: rval});
      }
      // value @type must be a string
      if('@type' in rval && !_isString(rval['@type'])) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; the "@type" value of an element ' +
          'containing "@value" must be a string.',
          'jsonld.SyntaxError', {element: rval});
      }
      // return only the value of @value if there is no @type or @language
      else if(count === 1) {
        rval = rval['@value'];
      }
      // drop null @values
      else if(rval['@value'] === null) {
        rval = null;
      }
    }
    // convert @type to an array
    else if('@type' in rval && !_isArray(rval['@type'])) {
      rval['@type'] = [rval['@type']];
    }
    // handle @set and @list
    else if('@set' in rval || '@list' in rval) {
      if(count !== 1) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; if an element has the property "@set" ' +
          'or "@list", then it must be its only property.',
          'jsonld.SyntaxError', {element: rval});
      }
      // optimize away @set
      if('@set' in rval) {
        rval = rval['@set'];
      }
    }
    // drop objects with only @language
    else if('@language' in rval && count === 1) {
      rval = null;
    }

    return rval;
  }

  // expand element according to value expansion rules
  return _expandValue(ctx, property, element, options.base);
};

/**
 * Performs JSON-LD framing.
 *
 * @param input the expanded JSON-LD to frame.
 * @param frame the expanded JSON-LD frame to use.
 * @param options the framing options.
 *
 * @return the framed output.
 */
Processor.prototype.frame = function(input, frame, options) {
  // create framing state
  var state = {
    options: options,
    subjects: {}
  };

  // produce a map of all subjects and name each bnode
  var namer = new UniqueNamer('_:t');
  _flatten(state.subjects, input, namer);

  // frame the subjects
  var framed = [];
  _frame(state, Object.keys(state.subjects), frame, framed, null);
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
 * Outputs the RDF statements found in the given JSON-LD object.
 *
 * @param input the JSON-LD object.
 * @param callback(err, statement) called when a statement is output, with the
 *          last statement as null.
 */
Processor.prototype.toRDF = function(input, callback) {
  // FIXME: implement
  callback(new JsonLdError('Not implemented', 'jsonld.NotImplemented'), null);
};

/**
 * Processes a local context and returns a new active context.
 *
 * @param activeCtx the current active context.
 * @param localCtx the local context to process.
 * @param options the context processing options.
 *
 * @return the new active context.
 */
Processor.prototype.processContext = function(
  activeCtx, localCtx, options) {
  // initialize the resulting context
  var rval = _clone(activeCtx);

  // normalize local context to an array
  var ctxs = _isArray(localCtx) ? localCtx : [localCtx];

  // process each context in order
  for(var i in ctxs) {
    var ctx = ctxs[i];

    // reset to initial context
    if(ctx === null) {
      rval = _getInitialContext();
      continue;
    }

    // dereference @context key if present
    if(_isObject(ctx) && '@context' in ctx) {
      ctx = ctx['@context'];
    }

    // context must be an object by now, all URLs resolved before this call
    if(!_isObject(ctx)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context must be an object.',
        'jsonld.SyntaxError', {context: ctx});
    }

    // define context mappings for keys in local context
    var defined = {};
    for(var key in ctx) {
      _defineContextMapping(rval, ctx, key, options.base, defined);
    }
  }

  return rval;
};

/**
 * Expands the given value by using the coercion and keyword rules in the
 * given context.
 *
 * @param ctx the active context to use.
 * @param property the property the value is associated with.
 * @param value the value to expand.
 * @param base the base IRI to use.
 *
 * @return the expanded value.
 */
function _expandValue(ctx, property, value, base) {
  // default to simple string return value
  var rval = value;

  // special-case expand @id and @type (skips '@id' expansion)
  var prop = _expandTerm(ctx, property);
  if(prop === '@id') {
    rval = _expandTerm(ctx, value, base);
  }
  else if(prop === '@type') {
    rval = _expandTerm(ctx, value);
  }
  else {
    // get type definition from context
    var type = jsonld.getContextValue(ctx, property, '@type');

    // do @id expansion
    if(type === '@id') {
      rval = {'@id': _expandTerm(ctx, value, base)};
    }
    // other type
    else if(type !== null) {
      rval = {'@value': String(value), '@type': type};
    }
    // check for language tagging
    else {
      var language = jsonld.getContextValue(ctx, property, '@language');
      if(language !== null) {
        rval = {'@value': String(value), '@language': language};
      }
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

      // convert @lists into embedded blank node linked lists
      for(var i in objects) {
        var o = objects[i];
        if(_isListValue(o)) {
          objects[i] = _makeLinkedList(o);
        }
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
 * @return the head of the linked list of blank nodes.
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

  return tail;
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
      var recurse = [];
      for(var n in permutation) {
        var bnode = permutation[n];

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
 * Recursively flattens the subjects in the given JSON-LD expanded input.
 *
 * @param subjects a map of subject @id to subject.
 * @param input the JSON-LD expanded input.
 * @param namer the blank node namer.
 * @param name the name assigned to the current input if it is a bnode.
 * @param list the list to append to, null for none.
 */
function _flatten(subjects, input, namer, name, list) {
  // recurse through array
  if(_isArray(input)) {
    for(var i in input) {
      _flatten(subjects, input[i], namer, undefined, list);
    }
  }
  // handle subject
  else if(_isObject(input)) {
    // add value to list
    if(_isValue(input) && list) {
      list.push(input);
      return;
    }

    // get name for subject
    if(_isUndefined(name)) {
      name = _isBlankNode(input) ? namer.getName(input['@id']) : input['@id'];
    }

    // add subject reference to list
    if(list) {
      list.push({'@id': name});
    }

    // create new subject or merge into existing one
    var subject = subjects[name] = subjects[name] || {};
    subject['@id'] = name;
    for(var prop in input) {
      // skip @id
      if(prop === '@id') {
        continue;
      }

      // copy keywords
      if(_isKeyword(prop)) {
        subject[prop] = input[prop];
        continue;
      }

      // iterate over objects
      var objects = input[prop];
      for(var i in objects) {
        var o = objects[i];

        // handle embedded subject or subject reference
        if(_isSubject(o) || _isSubjectReference(o)) {
          // rename blank node @id
          var id = ('@id' in o) ? o['@id'] : '_:';
          if(id.indexOf('_:') === 0) {
            id = namer.getName(id);
          }

          // add reference and recurse
          jsonld.addValue(subject, prop, {'@id': id}, true);
          _flatten(subjects, o, namer, id, null);
        }
        else {
          // recurse into list
          if(_isListValue(o)) {
            var l = [];
            _flatten(subjects, o['@list'], namer, name, l);
            o = {'@list': l};
          }

          // add non-subject
          jsonld.addValue(subject, prop, o, true);
        }
      }
    }
  }
  // add non-object to list
  else if(list) {
    list.push(input);
  }
}

/**
 * Frames subjects according to the given frame.
 *
 * @param state the current framing state.
 * @param subjects the subjects to filter.
 * @param frame the frame.
 * @param parent the parent subject or top-level array.
 * @param property the parent property, initialized to null.
 */
function _frame(state, subjects, frame, parent, property) {
  // validate the frame
  _validateFrame(state, frame);
  frame = frame[0];

  // filter out subjects that match the frame
  var matches = _filterSubjects(state, subjects, frame);

  // get flags for current frame
  var options = state.options;
  var embedOn = _getFrameFlag(frame, options, 'embed');
  var explicitOn = _getFrameFlag(frame, options, 'explicit');

  // add matches to output
  for(var id in matches) {
    /* Note: In order to treat each top-level match as a compartmentalized
    result, create an independent copy of the embedded subjects map when the
    property is null, which only occurs at the top-level. */
    if(property === null) {
      state.embeds = {};
    }

    // start output
    var output = {};
    output['@id'] = id;

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
      var props = Object.keys(subject).sort();
      for(var i in props) {
        var prop = props[i];

        // copy keywords to output
        if(_isKeyword(prop)) {
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

        // add objects
        var objects = subject[prop];
        for(var i in objects) {
          var o = objects[i];

          // recurse into list
          if(_isListValue(o)) {
            // add empty list
            var list = {'@list': []};
            _addFrameOutput(state, output, prop, list);

            // add list objects
            var src = o['@list'];
            for(var n in src) {
              o = src[n];
              // recurse into subject reference
              if(_isSubjectReference(o)) {
                _frame(state, [o['@id']], frame[prop], list, '@list');
              }
              // include other values automatically
              else {
                _addFrameOutput(state, list, '@list', _clone(o));
              }
            }
            continue;
          }

          // recurse into subject reference
          if(_isSubjectReference(o)) {
            _frame(state, [o['@id']], frame[prop], output, prop);
          }
          // include other values automatically
          else {
            _addFrameOutput(state, output, prop, _clone(o));
          }
        }
      }

      // handle defaults
      var props = Object.keys(frame).sort();
      for(var i in props) {
        var prop = props[i];

        // skip keywords
        if(_isKeyword(prop)) {
          continue;
        }

        // if omit default is off, then include default values for properties
        // that appear in the next frame but are not in the matching subject
        var next = frame[prop][0];
        var omitDefaultOn = _getFrameFlag(next, options, 'omitDefault');
        if(!omitDefaultOn && !(prop in output)) {
          var preserve = '@null';
          if('@default' in next) {
            preserve = _clone(next['@default']);
          }
          output[prop] = {'@preserve': preserve};
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
 * @param frame the frame.
 * @param options the framing options.
 * @param name the flag name.
 *
 * @return the flag value.
 */
function _getFrameFlag(frame, options, name) {
  var flag = '@' + name;
  return (flag in frame) ? frame[flag][0] : options[name];
};

/**
 * Validates a JSON-LD frame, throwing an exception if the frame is invalid.
 *
 * @param state the current frame state.
 * @param frame the frame to validate.
 */
function _validateFrame(state, frame) {
  if(!_isArray(frame) || frame.length !== 1 || !_isObject(frame[0])) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; a JSON-LD frame must be a single object.',
      'jsonld.SyntaxError', {frame: frame});
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
  // filter subjects in @id order
  var rval = {};
  subjects.sort();
  for(var i in subjects) {
    var id = subjects[i];
    var subject = state.subjects[id];
    if(_filterSubject(subject, frame)) {
      rval[id] = subject;
    }
  }
  return rval;
}

/**
 * Returns true if the given subject matches the given frame.
 *
 * @param subject the subject to check.
 * @param frame the frame to check.
 *
 * @return true if the subject matches, false if not.
 */
function _filterSubject(subject, frame) {
  // check @type (object value means 'any' type, fall through to ducktyping)
  if('@type' in frame &&
    !(frame['@type'].length === 1 && _isObject(frame['@type'][0]))) {
    var types = frame['@type'];
    for(var i in types) {
      // any matching @type is a match
      if(jsonld.hasValue(subject, '@type', types[i])) {
        return true;
      }
    }
    return false;
  }

  // check ducktype
  for(var key in frame) {
    // only not a duck if @id or non-keyword isn't in subject
    if((key === '@id' || !_isKeyword(key)) && !(key in subject)) {
      return false;
    }
  }
  return true;
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
  // embed subject properties in output
  var objects = subject[property];
  for(var i in objects) {
    var o = objects[i];

    // recurse into @list
    if(_isListValue(o)) {
      var list = {'@list': []};
      _addFrameOutput(state, output, property, list);
      return _embedValues(state, o, '@list', list['@list']);
    }

    // handle subject reference
    if(_isSubjectReference(o)) {
      var id = o['@id'];

      // embed full subject if isn't already embedded
      if(!(id in state.embeds)) {
        // add embed
        var embed = {parent: output, property: property};
        state.embeds[id] = embed;

        // recurse into subject
        o = {};
        var s = state.subjects[id];
        for(var prop in s) {
          // copy keywords
          if(_isKeyword(prop)) {
            o[prop] = _clone(s[prop]);
            continue;
          }
          _embedValues(state, s, prop, o);
        }
      }
      _addFrameOutput(state, output, property, o);
    }
    // copy non-subject value
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
  var subject = {'@id': id};

  // remove existing embed
  if(_isArray(parent)) {
    // replace subject with reference
    for(var i in parent) {
      if(jsonld.compareValues(parent[i], subject)) {
        parent[i] = subject;
        break;
      }
    }
  }
  else {
    // replace subject with reference
    var useArray = _isArray(parent[property]);
    jsonld.removeValue(parent, property, subject, useArray);
    jsonld.addValue(parent, property, subject, useArray);
  }

  // recursively remove dependent dangling embeds
  var removeDependents = function(id) {
    // get embed keys as a separate array to enable deleting keys in map
    var ids = Object.keys(embeds);
    for(var i in ids) {
      var next = ids[i];
      if(next in embeds && _isObject(embeds[next].parent) &&
        embeds[next].parent['@id'] === id) {
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
 * @param property the parent property.
 * @param output the output to add.
 */
function _addFrameOutput(state, parent, property, output) {
  if(_isObject(parent)) {
    jsonld.addValue(parent, property, output, true);
  }
  else {
    parent.push(output);
  }
}

/**
 * Removes the @preserve keywords as the last step of the framing algorithm.
 *
 * @param ctx the active context used to compact the input.
 * @param input the framed, compacted output.
 *
 * @return the resulting output.
 */
function _removePreserve(ctx, input) {
  // recurse through arrays
  if(_isArray(input)) {
    var output = [];
    for(var i in input) {
      var result = _removePreserve(ctx, input[i]);
      // drop nulls from arrays
      if(result !== null) {
        output.push(result);
      }
    }
    input = output;
  }
  else if(_isObject(input)) {
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
    if(_isListValue(input)) {
      input['@list'] = _removePreserve(ctx, input['@list']);
      return input;
    }

    // recurse through properties
    for(var prop in input) {
      var result = _removePreserve(ctx, input[prop]);
      var container = jsonld.getContextValue(ctx, prop, '@container');
      if(_isArray(result) && result.length === 1 &&
        container !== '@set' && container !== '@list') {
        result = result[0];
      }
      input[prop] = result;
    }
  }
  return input;
}

/**
 * Compares two strings first based on length and then lexicographically.
 *
 * @param a the first string.
 * @param b the second string.
 *
 * @return -1 if a < b, 1 if a > b, 0 if a == b.
 */
function _compareShortestLeast(a, b) {
  if(a.length < b.length) {
    return -1;
  }
  else if(b.length < a.length) {
    return 1;
  }
  return (a < b) ? -1 : ((a > b) ? 1 : 0);
}

/**
 * Ranks a term that is possible choice for compacting an IRI associated with
 * the given value.
 *
 * @param ctx the active context.
 * @param term the term to rank.
 * @param value the associated value.
 *
 * @return the term rank.
 */
function _rankTerm(ctx, term, value) {
  // no term restrictions for a null value
  if(value === null) {
    return 3;
  }

  // get context entry for term
  var entry = ctx.mappings[term];
  var hasType = ('@type' in entry);
  var hasLanguage = ('@language' in entry);
  var hasDefaultLanguage = ('@language' in ctx);

  // @list rank is the sum of its values' ranks
  if(_isListValue(value)) {
    var list = value['@list'];
    if(list.length === 0) {
      return (entry['@container'] === '@list') ? 1 : 0;
    }
    // sum term ranks for each list value
    var sum = 0;
    for(var i in list) {
      sum += _rankTerm(ctx, term, list[i]);
    }
    return sum;
  }

  // rank boolean or number
  if(_isBoolean(value) || _isNumber(value)) {
    var type;
    if(_isBoolean(value)) {
      type = XSD['boolean'];
    }
    else if(_isDouble(value)) {
      type = XSD['double'];
    }
    else {
      type = XSD['integer'];
    }
    if(entry['@type'] === type) {
      return 3;
    }
    return (!hasType && !hasLanguage) ? 2 : 1;
  }

  // rank string (this means the value has no @language)
  if(_isString(value)) {
    // entry @language is specifically null or no @type, @language, or default
    if(entry['@language'] === null ||
      (!hasType && !hasLanguage && !hasDefaultLanguage)) {
      return 3;
    }
    return 0;
  }

  // Note: Value must be an object that is a @value or subject/reference.

  // @value must have either @type or @language
  if(_isValue(value)) {
    if('@type' in value) {
      // @types match
      if(value['@type'] === entry['@type']) {
        return 3;
      }
      return (!hasType && !hasLanguage) ? 1 : 0;
    }

    // @languages match or entry has no @type or @language but default
    // @language matches
    if((value['@language'] === entry['@language']) ||
      (!hasType && !hasLanguage && value['@language'] === ctx['@language'])) {
      return 3;
    }
    return (!hasType && !hasLanguage) ? 1 : 0;
  }

  // value must be a subject/reference
  if(entry['@type'] === '@id') {
    return 3;
  }
  return (!hasType && !hasLanguage) ? 1 : 0;
}

/**
 * Compacts an IRI or keyword into a term or prefix if it can be. If the
 * IRI has an associated value it may be passed.
 *
 * @param ctx the active context to use.
 * @param iri the IRI to compact.
 * @param value the value to check or null.
 *
 * @return the compacted term, prefix, keyword alias, or the original IRI.
 */
function _compactIri(ctx, iri, value) {
  // can't compact null
  if(iri === null) {
    return iri;
  }

  // compact rdf:type
  if(iri === RDF['type']) {
    return '@type';
  }

  // term is a keyword
  if(_isKeyword(iri)) {
    // return alias if available
    var aliases = ctx.keywords[iri];
    if(aliases.length > 0) {
      return aliases[0];
    }
    else {
      // no alias, keep original keyword
      return iri;
    }
  }

  // default value to null
  if(_isUndefined(value)) {
    value = null;
  }

  // find all possible term matches
  var terms = [];
  var highest = 0;
  var listContainer = false;
  var isList = _isListValue(value);
  for(var term in ctx.mappings) {
    // skip terms with non-matching iris
    var entry = ctx.mappings[term];
    if(entry['@id'] !== iri) {
      continue;
    }
    // skip @set containers for @lists
    if(isList && entry['@container'] === '@set') {
      continue;
    }
    // skip @list containers for non-@lists
    if(!isList && entry['@container'] === '@list') {
      continue;
    }
    // for @lists, if listContainer is set, skip non-list containers
    if(isList && listContainer && entry['@container'] !== '@list') {
      continue;
    }

    // rank term
    var rank = _rankTerm(ctx, term, value);
    if(rank > 0) {
      // add 1 to rank if container is a @set
      if(entry['@container'] === '@set') {
        rank += 1;
      }

      // for @lists, give preference to @list containers
      if(isList && !listContainer && entry['@container'] === '@list') {
        listContainer = true;
        terms.length = 0;
        highest = rank;
        terms.push(term);
      }
      // only push match if rank meets current threshold
      else if(rank >= highest) {
        if(rank > highest) {
          terms.length = 0;
          highest = rank;
        }
        terms.push(term);
      }
    }
  }

  // no term matches, add possible CURIEs
  if(terms.length === 0) {
    for(var term in ctx.mappings) {
      // skip terms with colons, they can't be prefixes
      if(term.indexOf(':') !== -1) {
        continue;
      }
      // skip entries with @ids that are not partial matches
      var entry = ctx.mappings[term];
      if(entry['@id'] === iri || iri.indexOf(entry['@id']) !== 0) {
        continue;
      }

      // add CURIE as term if it has no mapping
      var curie = term + ':' + iri.substr(entry['@id'].length);
      if(!(curie in ctx.mappings)) {
        terms.push(curie);
      }
    }
  }

  // no matching terms, use IRI
  if(terms.length === 0) {
    return iri;
  }

  // return shortest and lexicographically-least term
  terms.sort(_compareShortestLeast);
  return terms[0];
}

/**
 * Defines a context mapping during context processing.
 *
 * @param activeCtx the current active context.
 * @param ctx the local context being processed.
 * @param key the key in the local context to define the mapping for.
 * @param base the base IRI.
 * @param defined a map of defining/defined keys to detect cycles and prevent
 *          double definitions.
 */
function _defineContextMapping(activeCtx, ctx, key, base, defined) {
  if(key in defined) {
    // key already defined
    if(defined[key]) {
      return;
    }
    // cycle detected
    throw new JsonLdError(
      'Cyclical context definition detected.',
      'jsonld.CyclicalContext', {context: ctx, key: key});
  }

  // now defining key
  defined[key] = false;

  // if key has a prefix, define it first
  var colon = key.indexOf(':');
  var prefix = null;
  if(colon !== -1) {
    prefix = key.substr(0, colon);
    if(prefix in ctx) {
      // define parent prefix
      _defineContextMapping(activeCtx, ctx, prefix, base, defined);
    }
  }

  // get context key value
  var value = ctx[key];

  if(_isKeyword(key)) {
    // only @language is permitted
    if(key !== '@language') {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; keywords cannot be overridden.',
        'jsonld.SyntaxError', {context: ctx});
    }

    if(value !== null && !_isString(value)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; the value of "@language" in a ' +
        '@context must be a string or null.',
        'jsonld.SyntaxError', {context: ctx});
    }

    if(value === null) {
      delete activeCtx['@language'];
    }
    else {
      activeCtx['@language'] = value;
    }
    defined[key] = true;
    return;
  }

  // clear context entry
  if(value === null) {
    if(key in activeCtx.mappings) {
      // if key is a keyword alias, remove it
      var kw = activeCtx.mappings[key]['@id'];
      if(_isKeyword(kw)) {
        var aliases = activeCtx.keywords[kw];
        aliases.splice(aliases.indexOf(key), 1);
      }
      delete activeCtx.mappings[key];
    }
    defined[key] = true;
    return;
  }

  if(_isString(value)) {
    if(_isKeyword(value)) {
      // disallow aliasing @context and @preserve
      if(value === '@context' || value === '@preserve') {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; @context and @preserve cannot be aliased.',
          'jsonld.SyntaxError');
      }

      // uniquely add key as a keyword alias and resort
      var aliases = activeCtx.keywords[value];
      if(aliases.indexOf(key) === -1) {
        aliases.push(key);
        aliases.sort(_compareShortestLeast);
      }
    }
    else {
      // expand value to a full IRI
      value = _expandContextIri(activeCtx, ctx, value, base, defined);
    }

    // define/redefine key to expanded IRI/keyword
    activeCtx.mappings[key] = {'@id': value};
    defined[key] = true;
    return;
  }

  if(!_isObject(value)) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; @context property values must be ' +
      'strings or objects.',
      'jsonld.SyntaxError', {context: ctx});
  }

  // create new mapping
  var mapping = {};

  if('@id' in value) {
    var id = value['@id'];
    if(!_isString(id)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context @id values must be strings.',
        'jsonld.SyntaxError', {context: ctx});
    }

    // expand @id to full IRI
    id = _expandContextIri(activeCtx, ctx, id, base, defined);

    // add @id to mapping
    mapping['@id'] = id;
  }
  else {
    // non-IRIs *must* define @ids
    if(prefix === null) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context terms must define an @id.',
        'jsonld.SyntaxError', {context: ctx, key: key});
    }

    // set @id based on prefix parent
    if(prefix in activeCtx.mappings) {
      var suffix = key.substr(colon + 1);
      mapping['@id'] = activeCtx.mappings[prefix]['@id'] + suffix;
    }
    // key is an absolute IRI
    else {
      mapping['@id'] = key;
    }
  }

  if('@type' in value) {
    var type = value['@type'];
    if(!_isString(type)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context @type values must be strings.',
        'jsonld.SyntaxError', {context: ctx});
    }

    if(type !== '@id') {
      // expand @type to full IRI
      type = _expandContextIri(activeCtx, ctx, type, '', defined);
    }

    // add @type to mapping
    mapping['@type'] = type;
  }

  if('@container' in value) {
    var container = value['@container'];
    if(container !== '@list' && container !== '@set') {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context @container value must be ' +
        '"@list" or "@set".',
        'jsonld.SyntaxError', {context: ctx});
    }

    // add @container to mapping
    mapping['@container'] = container;
  }

  if('@language' in value && !('@type' in value)) {
    var language = value['@language'];
    if(language !== null && !_isString(language)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context @language value must be ' +
        'a string or null.',
        'jsonld.SyntaxError', {context: ctx});
    }

    // add @language to mapping
    mapping['@language'] = language;
  }

  // merge onto parent mapping if one exists for a prefix
  if(prefix !== null && prefix in activeCtx.mappings) {
    var child = mapping;
    var mapping = _clone(activeCtx.mappings[prefix]);
    for(var k in child) {
      mapping[k] = child[k];
    }
  }

  // define key mapping
  activeCtx.mappings[key] = mapping;
  defined[key] = true;
}

/**
 * Expands a string value to a full IRI during context processing. It can
 * be assumed that the value is not a keyword.
 *
 * @param activeCtx the current active context.
 * @param ctx the local context being processed.
 * @param value the string value to expand.
 * @param base the base IRI.
 * @param defined a map for tracking cycles in context definitions.
 *
 * @return the expanded value.
 */
function _expandContextIri(activeCtx, ctx, value, base, defined) {
  // dependency not defined, define it
  if(value in ctx && defined[value] !== true) {
    _defineContextMapping(activeCtx, ctx, value, base, defined);
  }

  // recurse if value is a term
  if(value in activeCtx.mappings) {
    var id = activeCtx.mappings[value]['@id'];
    // value is already an absolute IRI
    if(value === id) {
      return value;
    }
    return _expandContextIri(activeCtx, ctx, id, base, defined);
  }

  // split value into prefix:suffix
  var colon = value.indexOf(':');
  if(colon !== -1) {
    var prefix = value.substr(0, colon);
    var suffix = value.substr(colon + 1);

    // a prefix of '_' indicates a blank node
    if(prefix === '_') {
      return value;
    }

    // a suffix of '//' indicates value is an absolute IRI
    if(suffix.indexOf('//') === 0) {
      return value;
    }

    // dependency not defined, define it
    if(prefix in ctx && defined[prefix] !== true) {
      _defineContextMapping(activeCtx, ctx, prefix, base, defined);
    }

    // recurse if prefix is defined
    if(prefix in activeCtx.mappings) {
      var id = activeCtx.mappings[prefix]['@id'];
      return _expandContextIri(activeCtx, ctx, id, base, defined) + suffix;
    }

    // consider value an absolute IRI
    return value;
  }

  // prepend base
  value = base + value;

  // value must now be an absolute IRI
  if(!_isAbsoluteIri(value)) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; a @context value does not expand to ' +
      'an absolute IRI.',
      'jsonld.SyntaxError', {context: ctx, value: value});
  }

  return value;
}

/**
 * Expands a term into an absolute IRI. The term may be a regular term, a
 * prefix, a relative IRI, or an absolute IRI. In any case, the associated
 * absolute IRI will be returned.
 *
 * @param ctx the active context to use.
 * @param term the term to expand.
 * @param base the base IRI to use if a relative IRI is detected.
 *
 * @return the expanded term as an absolute IRI.
 */
function _expandTerm(ctx, term, base) {
  // nothing to expand
  if(term === null) {
    return null;
  }

  // the term has a mapping, so it is a plain term
  if(term in ctx.mappings) {
    var id = ctx.mappings[term]['@id'];
    // term is already an absolute IRI
    if(term === id) {
      return term;
    }
    return _expandTerm(ctx, id, base);
  }

  // split term into prefix:suffix
  var colon = term.indexOf(':');
  if(colon !== -1) {
    var prefix = term.substr(0, colon);
    var suffix = term.substr(colon + 1);

    // a prefix of '_' indicates a blank node
    if(prefix === '_') {
      return term;
    }

    // a suffix of '//' indicates value is an absolute IRI
    if(suffix.indexOf('//') === 0) {
      return term;
    }

    // the term's prefix has a mapping, so it is a CURIE
    if(prefix in ctx.mappings) {
      return _expandTerm(ctx, ctx.mappings[prefix]['@id'], base) + suffix;
    }

    // consider term an absolute IRI
    return term;
  }

  // prepend base to term
  if(!_isUndefined(base)) {
    term = base + term;
  }

  return term;
}

/**
 * Gets the initial context.
 *
 * @return the initial context.
 */
function _getInitialContext() {
  return {
    mappings: {},
    keywords: {
      '@context': [],
      '@container': [],
      '@default': [],
      '@embed': [],
      '@explicit': [],
      '@graph': [],
      '@id': [],
      '@language': [],
      '@list': [],
      '@omitDefault': [],
      '@preserve': [],
      '@set': [],
      '@type': [],
      '@value': []
    }
  };
}

/**
 * Returns whether or not the given value is a keyword (or a keyword alias).
 *
 * @param value the value to check.
 * @param [ctx] the active context to check against.
 *
 * @return true if the value is a keyword, false if not.
 */
function _isKeyword(value, ctx) {
  if(ctx) {
    if(value in ctx.keywords) {
      return true;
    }
    for(var key in ctx.keywords) {
      var aliases = ctx.keywords[key];
      if(aliases.indexOf(value) !== -1) {
        return true;
      }
    }
  }
  else {
    switch(value) {
    case '@context':
    case '@container':
    case '@default':
    case '@embed':
    case '@explicit':
    case '@graph':
    case '@id':
    case '@language':
    case '@list':
    case '@omitDefault':
    case '@preserve':
    case '@set':
    case '@type':
    case '@value':
      return true;
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
  return (input !== null && !_isUndefined(input) &&
    input.constructor === Object);
}

/**
 * Returns true if the given input is an empty Object.
 *
 * @param input the input to check.
 *
 * @return true if the input is an empty Object, false if not.
 */
function _isEmptyObject(input) {
  return _isObject(input) && Object.keys(input).length === 0;
}

/**
 * Returns true if the given input is an Array.
 *
 * @param input the input to check.
 *
 * @return true if the input is an Array, false if not.
 */
function _isArray(input) {
  return (input !== null && !_isUndefined(input) &&
    input.constructor === Array);
}

/**
 * Returns true if the given input is an Array of Strings.
 *
 * @param input the input to check.
 *
 * @return true if the input is an Array of Strings, false if not.
 */
function _isArrayOfStrings(input) {
  if(!_isArray(input)) {
    return false;
  }
  for(var i in input) {
    if(!_isString(input[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Returns true if the given input is a String.
 *
 * @param input the input to check.
 *
 * @return true if the input is a String, false if not.
 */
function _isString(input) {
  return (input !== null && !_isUndefined(input) &&
    input.constructor === String);
}

/**
 * Returns true if the given input is a Number.
 *
 * @param input the input to check.
 *
 * @return true if the input is a Number, false if not.
 */
function _isNumber(input) {
  return (input !== null && !_isUndefined(input) &&
    input.constructor === Number);
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
  return (input !== null && !_isUndefined(input) &&
    input.constructor === Boolean);
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
 *
 * @return true if the value is a subject with properties, false if not.
 */
function _isSubject(value) {
  var rval = false;

  // Note: A value is a subject if all of these hold true:
  // 1. It is an Object.
  // 2. It is not a @value, @set, or @list.
  // 3. It has more than 1 key OR any existing key is not @id.
  if(_isObject(value) &&
    !(('@value' in value) || ('@set' in value) || ('@list' in value))) {
    var keyCount = Object.keys(value).length;
    rval = (keyCount > 1 || !('@id' in value));
  }

  return rval;
}

/**
 * Returns true if the given value is a subject reference.
 *
 * @param value the value to check.
 *
 * @return true if the value is a subject reference, false if not.
 */
function _isSubjectReference(value) {
  // Note: A value is a subject reference if all of these hold true:
  // 1. It is an Object.
  // 2. It has a single key: @id.
  return (_isObject(value) && Object.keys(value).length === 1 &&
    ('@id' in value));
}

/**
 * Returns true if the given value is a @value.
 *
 * @param value the value to check.
 *
 * @return true if the value is a @value, false if not.
 */
function _isValue(value) {
  // Note: A value is a @value if all of these hold true:
  // 1. It is an Object.
  // 2. It has the @value property.
  return _isObject(value) && ('@value' in value);
}

/**
 * Returns true if the given value is a @set.
 *
 * @param value the value to check.
 *
 * @return true if the value is a @set, false if not.
 */
function _isSetValue(value) {
  // Note: A value is a @set if all of these hold true:
  // 1. It is an Object.
  // 2. It has the @set property.
  return _isObject(value) && ('@set' in value);
}

/**
 * Returns true if the given value is a @list.
 *
 * @param value the value to check.
 *
 * @return true if the value is a @list, false if not.
 */
function _isListValue(value) {
  // Note: A value is a @list if all of these hold true:
  // 1. It is an Object.
  // 2. It has the @list property.
  return _isObject(value) && ('@list' in value);
}

/**
 * Returns true if the given value is a blank node.
 *
 * @param value the value to check.
 *
 * @return true if the value is a blank node, false if not.
 */
function _isBlankNode(value) {
  var rval = false;
  // Note: A value is a blank node if all of these hold true:
  // 1. It is an Object.
  // 2. If it has an @id key its value begins with '_:'.
  // 3. It has no keys OR is not a @value, @set, or @list.
  if(_isObject(value)) {
    if('@id' in value) {
      rval = (value['@id'].indexOf('_:') === 0);
    }
    else {
      rval = (Object.keys(value).length === 0 ||
        !(('@value' in value) || ('@set' in value) || ('@list' in value)));
    }
  }
  return rval;
}

/**
 * Returns true if the given value is an absolute IRI, false if not.
 *
 * @param value the value to check.
 *
 * @return true if the value is an absolute IRI, false if not.
 */
function _isAbsoluteIri(value) {
  return value.indexOf(':') !== -1;
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
        // FIXME: needs to recurse to resolve URLs in the result
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
