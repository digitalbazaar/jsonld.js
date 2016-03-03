import {_isNumber} from './_isNumber';
export const _isDouble = function(v) {
  return _isNumber(v) && String(v).indexOf('.') !== -1;
}
