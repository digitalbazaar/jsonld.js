export function _isString(v) {
      return (typeof v === 'string' ||
        Object.prototype.toString.call(v) === '[object String]');
    }
