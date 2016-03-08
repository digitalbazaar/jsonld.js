import {_isObject} from './_isObject';
export function _isList(v) {
      // Note: A value is a @list if all of these hold true:
      // 1. It is an Object.
      // 2. It has the @list property.
      return _isObject(v) && ('@list' in v);
    }
