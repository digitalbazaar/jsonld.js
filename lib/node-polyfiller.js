var polyfillSideEffect = (function() {
  if (!global.Promise) {
    global.Promise = require('es6-promise').Promise;
  }
})();

export default polyfillSideEffect;
