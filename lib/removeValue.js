import {compareValues} from './compareValues';
import {removeProperty} from './removeProperty';
import {getValues} from './getValues';
export const removeValue = function(subject, property, value, options) {
      options = options || {};
      if (!('propertyIsArray' in options)) {
        options.propertyIsArray = false;
      }

      // filter out value
      var values = getValues(subject, property).filter(function(e) {
        return !compareValues(e, value);
      });

      if (values.length === 0) {
        removeProperty(subject, property);
      } else if (values.length === 1 && !options.propertyIsArray) {
        subject[property] = values[0];
      } else {
        subject[property] = values;
      }
    };
