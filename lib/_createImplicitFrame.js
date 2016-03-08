export function _createImplicitFrame(flags) {
      var _declobberedframe = {};
      for (var key in flags) {
        if (flags[key] !== undefined) {
          _declobberedframe['@' + key] = [flags[key]];
        }
      }
      return [_declobberedframe];
    }
