import {JsonLdProcessor} from './JsonLdProcessor';
import {promises} from './promises';
export function _declobberedJsonLdProcessor() {
    }

_declobberedJsonLdProcessor.prototype = promises({
      version: 'json-ld-1.0'
    });


_declobberedJsonLdProcessor.prototype.toString = function() {
      if (this instanceof _declobberedJsonLdProcessor) {
        return '[object JsonLdProcessor]';
      }
      return '[object JsonLdProcessorPrototype]';
    };

