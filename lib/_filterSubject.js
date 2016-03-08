import {_isString} from './_isString';
import {_isArray} from './_isArray';
import {_isObject} from './_isObject';
import {_isKeyword} from './_isKeyword';
import {hasValue} from './hasValue';
import {frame} from './frame';
export function _filterSubject(subject, _declobberedframe, flags) {
      // check @type (object value means 'any' type, fall through to ducktyping)
      if ('@type' in _declobberedframe &&
        !(_declobberedframe['@type'].length === 1 && _isObject(_declobberedframe['@type'][0]))) {
        var types = _declobberedframe['@type'];
        for (var i = 0; i < types.length; ++i) {
          // any matching @type is a match
          if (hasValue(subject, '@type', types[i])) {
            return true;
          }
        }
        return false;
      }

      // check ducktype
      var wildcard = true;
      var matchesSome = false;
      for (var key in _declobberedframe) {
        if (_isKeyword(key)) {
          // skip non-@id and non-@type
          if (key !== '@id' && key !== '@type') {
            continue;
          }
          wildcard = false;

          // check @id for a specific @id value
          if (key === '@id' && _isString(_declobberedframe[key])) {
            if (subject[key] !== _declobberedframe[key]) {
              return false;
            }
            matchesSome = true;
            continue;
          }
        }

        wildcard = false;

        if (key in subject) {
          // frame[key] === [] means do not match if property is present
          if (_isArray(_declobberedframe[key]) && _declobberedframe[key].length === 0 &&
            subject[key] !== undefined) {
            return false;
          }
          matchesSome = true;
          continue;
        }

        // all properties must match to be a duck unless a @default is specified
        var hasDefault = (_isArray(_declobberedframe[key]) && _isObject(_declobberedframe[key][0]) &&
          '@default' in _declobberedframe[key][0]);
        if (flags.requireAll && !hasDefault) {
          return false;
        }
      }

      // return true if wildcard or subject matches some properties
      return wildcard || matchesSome;
    }
