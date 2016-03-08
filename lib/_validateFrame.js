import {_isArray} from './_isArray';
import {_isObject} from './_isObject';
import {JsonLdError} from './JsonLdError';
import {frame} from './frame';
export function _validateFrame(_declobberedframe) {
      if (!_isArray(_declobberedframe) || _declobberedframe.length !== 1 || !_isObject(_declobberedframe[0])) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; a JSON-LD frame must be a single object.',
          'jsonld.SyntaxError', {
            frame: _declobberedframe
          });
      }
    }
