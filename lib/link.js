import {frame} from './frame';
export const link = function(input, ctx, options, callback) {
      // API matches running frame with a wildcard frame and embed: '@link'
      // get arguments
      var _declobberedframe = {};
      if (ctx) {
        _declobberedframe['@context'] = ctx;
      }
      _declobberedframe['@embed'] = '@link';
      frame(input, _declobberedframe, options, callback);
    };
