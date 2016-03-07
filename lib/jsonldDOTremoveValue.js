import {jsonldDOTcompareValues} from './jsonldDOTcompareValues';
import {jsonldDOTremoveProperty} from './jsonldDOTremoveProperty';
import {jsonldDOTgetValues} from './jsonldDOTgetValues';
export const jsonldDOTremoveValue = function(subject, property, value, options) {
  options = options || {};
  if(!('propertyIsArray' in options)) {
    options.propertyIsArray = false;
  }

  // filter out value
  var values = jsonldDOTgetValues(subject, property).filter(function(e) {
    return !jsonldDOTcompareValues(e, value);
  });

  if(values.length === 0) {
    jsonldDOTremoveProperty(subject, property);
  } else if(values.length === 1 && !options.propertyIsArray) {
    subject[property] = values[0];
  } else {
    subject[property] = values;
  }
};
