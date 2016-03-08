import {_isString} from './_isString';
export function _isAbsoluteIri(v) {
      return _isString(v) && v.indexOf(':') !== -1;
    }
