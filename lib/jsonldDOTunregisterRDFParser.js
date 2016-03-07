import {_rdfParsers} from './_rdfParsers';
export const jsonldDOTunregisterRDFParser = function(contentType) {
  delete _rdfParsers[contentType];
};
