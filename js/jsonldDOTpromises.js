import {RDF} from './RDF';
import {jsonldDOTpromisify} from './jsonldDOTpromisify';
import {jsonldDOTmerge} from './jsonldDOTmerge';
import {jsonldDOTcreateNodeMap} from './jsonldDOTcreateNodeMap';
import {jsonldDOTtoRDF} from './jsonldDOTtoRDF';
import {jsonldDOTfromRDF} from './jsonldDOTfromRDF';
import {jsonldDOTnormalize} from './jsonldDOTnormalize';
import {jsonldDOTlink} from './jsonldDOTlink';
import {jsonldDOTframe} from './jsonldDOTframe';
import {jsonldDOTflatten} from './jsonldDOTflatten';
import {jsonldDOTexpand} from './jsonldDOTexpand';
import {jsonldDOTcompact} from './jsonldDOTcompact';
export const jsonldDOTpromises = function(options) {
  options = options || {};
  var slice = Array.prototype.slice;
  var promisify = jsonldDOTpromisify;

  // handle 'api' option as version, set defaults
  var api = options.api || {};
  var version = options.version || 'jsonld.js';
  if(typeof options.api === 'string') {
    if(!options.version) {
      version = options.api;
    }
    api = {};
  }

  api.expand = function(input) {
    if(arguments.length < 1) {
      throw new TypeError('Could not expand, too few arguments.');
    }
    return promisify.apply(null, [jsonldDOTexpand].concat(slice.call(arguments)));
  };
  api.compact = function(input, ctx) {
    if(arguments.length < 2) {
      throw new TypeError('Could not compact, too few arguments.');
    }
    var compact = function(input, ctx, options, callback) {
      // ensure only one value is returned in callback
      jsonldDOTcompact(input, ctx, options, function(err, compacted) {
        callback(err, compacted);
      });
    };
    return promisify.apply(null, [compact].concat(slice.call(arguments)));
  };
  api.flatten = function(input) {
    if(arguments.length < 1) {
      throw new TypeError('Could not flatten, too few arguments.');
    }
    return promisify.apply(
      null, [jsonldDOTflatten].concat(slice.call(arguments)));
  };
  api.frame = function(input, frame) {
    if(arguments.length < 2) {
      throw new TypeError('Could not frame, too few arguments.');
    }
    return promisify.apply(null, [jsonldDOTframe].concat(slice.call(arguments)));
  };
  api.fromRDF = function(dataset) {
    if(arguments.length < 1) {
      throw new TypeError('Could not convert from RDF, too few arguments.');
    }
    return promisify.apply(
      null, [jsonldDOTfromRDF].concat(slice.call(arguments)));
  };
  api.toRDF = function(input) {
    if(arguments.length < 1) {
      throw new TypeError('Could not convert to RDF, too few arguments.');
    }
    return promisify.apply(null, [jsonldDOTtoRDF].concat(slice.call(arguments)));
  };
  api.normalize = function(input) {
    if(arguments.length < 1) {
      throw new TypeError('Could not normalize, too few arguments.');
    }
    return promisify.apply(
      null, [jsonldDOTnormalize].concat(slice.call(arguments)));
  };

  if(version === 'jsonld.js') {
    api.link = function(input, ctx) {
      if(arguments.length < 2) {
        throw new TypeError('Could not link, too few arguments.');
      }
      return promisify.apply(
        null, [jsonldDOTlink].concat(slice.call(arguments)));
    };
    api.objectify = function(input) {
      return promisify.apply(
        null, [jsonld.objectify].concat(slice.call(arguments)));
    };
    api.createNodeMap = function(input) {
      return promisify.apply(
        null, [jsonldDOTcreateNodeMap].concat(slice.call(arguments)));
    };
    api.merge = function(input) {
      return promisify.apply(
        null, [jsonldDOTmerge].concat(slice.call(arguments)));
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

jsonldDOTpromises({api: jsonldDOTpromises});

