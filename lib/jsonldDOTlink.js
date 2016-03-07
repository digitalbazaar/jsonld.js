import {jsonldDOTframe} from './jsonldDOTframe';
export const jsonldDOTlink = function(input, ctx, options, callback) {
  // API matches running frame with a wildcard frame and embed: '@link'
  // get arguments
  var frame = {};
  if(ctx) {
    frame['@context'] = ctx;
  }
  frame['@embed'] = '@link';
  jsonldDOTframe(input, frame, options, callback);
};
