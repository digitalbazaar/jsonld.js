import {_isNumber} from './_isNumber';
export function _isDouble(v) {
      return _isNumber(v) && String(v).indexOf('.') !== -1;
    }
