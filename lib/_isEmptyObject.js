import {_isObject} from './_isObject';
export function _isEmptyObject(v) {
      return _isObject(v) && Object.keys(v).length === 0;
    }
