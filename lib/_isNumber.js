export function _isNumber(v) {
      return (typeof v === 'number' ||
        Object.prototype.toString.call(v) === '[object Number]');
    }
