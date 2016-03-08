import {_filterSubject} from './_filterSubject';
export function _filterSubjects(state, subjects, _declobberedframe, flags) {
      // filter subjects in @id order
      var rval = {};
      for (var i = 0; i < subjects.length; ++i) {
        var id = subjects[i];
        var subject = state.subjects[id];
        if (_filterSubject(subject, _declobberedframe, flags)) {
          rval[id] = subject;
        }
      }
      return rval;
    }
