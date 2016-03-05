import {_removeDotSegments} from './_removeDotSegments';
export const jsonldDOTurl = {};

jsonldDOTurl.parsers = {
    full: {
        keys: [
            'href',
            'protocol',
            'scheme',
            'authority',
            'auth',
            'user',
            'password',
            'hostname',
            'port',
            'path',
            'directory',
            'file',
            'query',
            'fragment'
        ],
        regex: /^(([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?(?:(((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
};


jsonldDOTurl.parse = function(str, parser) {
  var parsed = {};
  var o = jsonldDOTurl.parsers[parser || 'full'];
  var m = o.regex.exec(str);
  var i = o.keys.length;
  while(i--) {
    parsed[o.keys[i]] = (m[i] === undefined) ? null : m[i];
  }
  parsed.normalizedPath = _removeDotSegments(parsed.path, !!parsed.authority);
  return parsed;
};

