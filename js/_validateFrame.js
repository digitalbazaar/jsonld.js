import {_isArray} from './_isArray';
import {_isObject} from './_isObject';
import {JsonLdError} from './JsonLdError';
export const _validateFrame = function(frame) {
  if(!_isArray(frame) || frame.length !== 1 || !_isObject(frame[0])) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; a JSON-LD frame must be a single object.',
      'jsonld.SyntaxError', {frame: frame});
  }
}
