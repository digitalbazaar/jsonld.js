import {_declobberedIdentifierIssuer} from './_declobberedIdentifierIssuer';
import {_labelBlankNodes} from './_labelBlankNodes';
export const relabelBlankNodes = function(input, options) {
      options = options || {};
      var issuer = options.namer || options.issuer || new _declobberedIdentifierIssuer('_:b');
      return _labelBlankNodes(issuer, input);
    };
