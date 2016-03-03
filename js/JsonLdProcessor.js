import {jsonldDOTpromises} from './jsonldDOTpromises';
export const JsonLdProcessor = function() {}

JsonLdProcessor.prototype = jsonldDOTpromises({version: 'json-ld-1.0'});


JsonLdProcessor.prototype.toString = function() {
  if(this instanceof JsonLdProcessor) {
    return '[object JsonLdProcessor]';
  }
  return '[object JsonLdProcessorPrototype]';
};

