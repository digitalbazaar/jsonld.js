import {IdentifierIssuer} from './IdentifierIssuer';
import {_labelBlankNodes} from './_labelBlankNodes';
export const jsonldDOTrelabelBlankNodes = function(input, options) {
  options = options || {};
  var issuer = options.namer || options.issuer || new IdentifierIssuer('_:b');
  return _labelBlankNodes(issuer, input);
};
