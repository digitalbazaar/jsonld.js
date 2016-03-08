import {_rdfParsers} from './_rdfParsers';
export const unregisterRDFParser = function(contentType) {
      delete _rdfParsers[contentType];
    };
