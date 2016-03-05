import {_parseNQuads} from './_parseNQuads';
import {_clone} from './_clone';
import {URGNA2012} from './URGNA2012';
import {Processor} from './Processor';
import {JsonLdError} from './JsonLdError';
import {jsonldDOTtoRDF} from './jsonldDOTtoRDF';
import {RDF} from './literalVarDecs';
export const jsonldDOTnormalize = function(input, options, callback) {
  if(arguments.length < 1) {
    return setImmediate(function() {
      callback(new TypeError('Could not normalize, too few arguments.'));
    });
  }

  // get arguments
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  // set default options
  if(!('algorithm' in options)) {
    options.algorithm = 'URGNA2012';
  }
  if(!('base' in options)) {
    options.base = (typeof input === 'string') ? input : '';
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.documentLoader;
  }

  if('inputFormat' in options) {
    if(options.inputFormat !== 'application/nquads') {
      return callback(new JsonLdError(
        'Unknown normalization input format.',
        'jsonld.NormalizeError'));
    }
    var parsedInput = _parseNQuads(input);
    // do normalization
    new Processor().normalize(parsedInput, options, callback);
  } else {
    // convert to RDF dataset then do normalization
    var opts = _clone(options);
    delete opts.format;
    opts.produceGeneralizedRdf = false;
    jsonldDOTtoRDF(input, opts, function(err, dataset) {
      if(err) {
        return callback(new JsonLdError(
          'Could not convert input to RDF dataset before normalization.',
          'jsonld.NormalizeError', {cause: err}));
      }
      // do normalization
      new Processor().normalize(dataset, options, callback);
    });
  }
};
