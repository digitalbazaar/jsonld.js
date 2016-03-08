import {_parseRdfaApiData} from './_parseRdfaApiData';
import {_parseNQuads} from './_parseNQuads';
import {_rdfParsers} from './_rdfParsers';
export const registerRDFParser = function(contentType, parser) {
      _rdfParsers[contentType] = parser;
    };

registerRDFParser('application/nquads', _parseNQuads);


registerRDFParser('rdfa-api', _parseRdfaApiData);

