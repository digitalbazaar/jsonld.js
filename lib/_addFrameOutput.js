import {_isObject} from './_isObject';
import {addValue} from './addValue';
export function _addFrameOutput(parent, property, output) {
      if (_isObject(parent)) {
        addValue(parent, property, output, {
          propertyIsArray: true
        });
      } else {
        parent.push(output);
      }
    }
