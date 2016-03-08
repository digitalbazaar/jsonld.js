import {link} from './link';
export function _getFrameFlag(_declobberedframe, options, name) {
      var flag = '@' + name;
      var rval = (flag in _declobberedframe ? _declobberedframe[flag][0] : options[name]);
      if (name === 'embed') {
        // default is "@last"
        // backwards-compatibility support for "embed" maps:
        // true => "@last"
        // false => "@never"
        if (rval === true) {
          rval = '@last';
        } else if (rval === false) {
          rval = '@never';
        } else if (rval !== '@always' && rval !== '@never' && rval !== '@link') {
          rval = '@last';
        }
      }
      return rval;
    }
