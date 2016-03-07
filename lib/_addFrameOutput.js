import {_isObject} from './_isObject';
import {jsonldDOTaddValue} from './jsonldDOTaddValue';
export const _addFrameOutput = function(parent, property, output) {
  if(_isObject(parent)) {
    jsonldDOTaddValue(parent, property, output, {propertyIsArray: true});
  } else {
    parent.push(output);
  }
}
