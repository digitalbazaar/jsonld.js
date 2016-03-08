import {_isNumeric} from './_isNumeric';
import {XSD_BOOLEAN,XSD_DOUBLE,XSD_INTEGER,XSD_STRING} from './literalVarDecs';
export function _RDFToObject(o, useNativeTypes) {
      // convert IRI/blank node object to JSON-LD
      if (o.type === 'IRI' || o.type === 'blank node') {
        return {
          '@id': o.value
        };
      }

      // convert literal to JSON-LD
      var rval = {
        '@value': o.value
      };

      // add language
      if (o.language) {
        rval['@language'] = o.language;
      } else {
        var type = o.datatype;
        if (!type) {
          type = XSD_STRING;
        }
        // use native types for certain xsd types
        if (useNativeTypes) {
          if (type === XSD_BOOLEAN) {
            if (rval['@value'] === 'true') {
              rval['@value'] = true;
            } else if (rval['@value'] === 'false') {
              rval['@value'] = false;
            }
          } else if (_isNumeric(rval['@value'])) {
            if (type === XSD_INTEGER) {
              var i = parseInt(rval['@value'], 10);
              if (i.toFixed(0) === rval['@value']) {
                rval['@value'] = i;
              }
            } else if (type === XSD_DOUBLE) {
              rval['@value'] = parseFloat(rval['@value']);
            }
          }
          // do not add native type
          if ([XSD_BOOLEAN, XSD_INTEGER, XSD_DOUBLE, XSD_STRING]
              .indexOf(type) === -1) {
            rval['@type'] = type;
          }
        } else if (type !== XSD_STRING) {
          rval['@type'] = type;
        }
      }

      return rval;
    }
