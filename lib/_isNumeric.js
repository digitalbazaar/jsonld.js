export const _isNumeric = function(v) {
  return !isNaN(parseFloat(v)) && isFinite(v);
}
