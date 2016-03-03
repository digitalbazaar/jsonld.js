import {_isList} from './_isList';
import {_isArray} from './_isArray';
import {jsonldDOTcompareValues} from './jsonldDOTcompareValues';
import {jsonldDOThasProperty} from './jsonldDOThasProperty';
export const jsonldDOThasValue = function(subject, property, value) {
  var rval = false;
  if(jsonldDOThasProperty(subject, property)) {
    var val = subject[property];
    var isList = _isList(val);
    if(_isArray(val) || isList) {
      if(isList) {
        val = val['@list'];
      }
      for(var i = 0; i < val.length; ++i) {
        if(jsonldDOTcompareValues(value, val[i])) {
          rval = true;
          break;
        }
      }
    } else if(!_isArray(value)) {
      // avoid matching the set of values with an array value parameter
      rval = jsonldDOTcompareValues(value, val);
    }
  }
  return rval;
};
