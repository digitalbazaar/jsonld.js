import {_isString} from './_isString';
export const _isAbsoluteIri = function(v) {
  return _isString(v) && v.indexOf(':') !== -1;
}
