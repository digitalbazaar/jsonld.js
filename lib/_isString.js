export const _isString = function(v) {
  return (typeof v === 'string' ||
    Object.prototype.toString.call(v) === '[object String]');
}
