import 'setimmediate';

import _assign from 'lodash/assign';
import * as jsonldModule from './jsonld.js';

function wrapper(jsonld) {
  //jsonld.documentLoader = jsonldDOTdocumentLoader;
  // TODO do we need to clone the jsonldModule to match the existing API?
  // import _clone from '../dist/jsonld/_clone.js';
  // var jsonldClone = _clone(jsonldModule);
  _assign(jsonld, jsonldModule);
  return jsonld;
}

// generate a new jsonld API instance
var factory = function() {
  return wrapper(function() {
    return factory();
  });
};

wrapper(factory);

export default wrapper(factory);
