import {_isArray} from './_isArray';
import {hasValue} from './hasValue';
export const addValue = function(subject, property, value, options) {
      options = options || {};
      if (!('propertyIsArray' in options)) {
        options.propertyIsArray = false;
      }
      if (!('allowDuplicate' in options)) {
        options.allowDuplicate = true;
      }

      if (_isArray(value)) {
        if (value.length === 0 && options.propertyIsArray &&
          !(property in subject)) {
          subject[property] = [];
        }
        for (var i = 0; i < value.length; ++i) {
          addValue(subject, property, value[i], options);
        }
      } else if (property in subject) {
        // check if subject already has value if duplicates not allowed
        var _declobberedhasValue = (!options.allowDuplicate &&
        hasValue(subject, property, value));

        // make property an array if value not present or always an array
        if (!_isArray(subject[property]) &&
          (!_declobberedhasValue || options.propertyIsArray)) {
          subject[property] = [subject[property]];
        }

        // add new value
        if (!_declobberedhasValue) {
          subject[property].push(value);
        }
      } else {
        // add new value as set or single value
        subject[property] = options.propertyIsArray ? [value] : value;
      }
    };
