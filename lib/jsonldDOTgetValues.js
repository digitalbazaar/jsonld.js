import {_isArray} from './_isArray';
export const jsonldDOTgetValues = function(subject, property) {
  var rval = subject[property] || [];
  if(!_isArray(rval)) {
    rval = [rval];
  }
  return rval;
};
