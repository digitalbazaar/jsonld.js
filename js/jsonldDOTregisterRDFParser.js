import {_parseRdfaApiData} from './_parseRdfaApiData';
import {_parseNQuads} from './_parseNQuads';
import {_rdfParsers} from './_rdfParsers';
export const jsonldDOTregisterRDFParser = function(contentType, parser) {
  _rdfParsers[contentType] = parser;
};

jsonldDOTregisterRDFParser('application/nquads', _parseNQuads);


jsonldDOTregisterRDFParser('rdfa-api', _parseRdfaApiData);

