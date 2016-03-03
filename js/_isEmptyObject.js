import {_isObject} from './_isObject';
export const _isEmptyObject = function(v) {
  return _isObject(v) && Object.keys(v).length === 0;
}
