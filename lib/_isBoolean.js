export function _isBoolean(v) {
      return (typeof v === 'boolean' ||
        Object.prototype.toString.call(v) === '[object Boolean]');
    }
