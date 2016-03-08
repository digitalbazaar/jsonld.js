import {_isArray} from './_isArray';
import {_isObject} from './_isObject';
import {compareValues} from './compareValues';
import {removeValue} from './removeValue';
import {addValue} from './addValue';
export function _removeEmbed(state, id) {
      // get existing embed
      var embeds = state.uniqueEmbeds;
      var embed = embeds[id];
      var parent = embed.parent;
      var property = embed.property;

      // create reference to replace embed
      var subject = {
        '@id': id
      };

      // remove existing embed
      if (_isArray(parent)) {
        // replace subject with reference
        for (var i = 0; i < parent.length; ++i) {
          if (compareValues(parent[i], subject)) {
            parent[i] = subject;
            break;
          }
        }
      } else {
        // replace subject with reference
        var useArray = _isArray(parent[property]);
        removeValue(parent, property, subject, {
          propertyIsArray: useArray
        });
        addValue(parent, property, subject, {
          propertyIsArray: useArray
        });
      }

      // recursively remove dependent dangling embeds
      var removeDependents = function(id) {
        // get embed keys as a separate array to enable deleting keys in map
        var ids = Object.keys(embeds);
        for (var i = 0; i < ids.length; ++i) {
          var next = ids[i];
          if (next in embeds && _isObject(embeds[next].parent) &&
            embeds[next].parent['@id'] === id) {
            delete embeds[next];
            removeDependents(next);
          }
        }
      };
      removeDependents(id);
    }
