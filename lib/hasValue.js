import {_isList} from './_isList';
import {_isArray} from './_isArray';
import {compareValues} from './compareValues';
import {hasProperty} from './hasProperty';
export const hasValue = function(subject, property, value) {
      var rval = false;
      if (hasProperty(subject, property)) {
        var val = subject[property];
        var isList = _isList(val);
        if (_isArray(val) || isList) {
          if (isList) {
            val = val['@list'];
          }
          for (var i = 0; i < val.length; ++i) {
            if (compareValues(value, val[i])) {
              rval = true;
              break;
            }
          }
        } else if (!_isArray(value)) {
          // avoid matching the set of values with an array value parameter
          rval = compareValues(value, val);
        }
      }
      return rval;
    };
