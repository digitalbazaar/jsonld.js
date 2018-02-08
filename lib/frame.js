/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {isKeyword} = require('./context');
const graphTypes = require('./graphTypes');
const types = require('./types');
const util = require('./util');
const JsonLdError = require('./JsonLdError');
const {
  createNodeMap: _createNodeMap,
  mergeNodeMapGraphs: _mergeNodeMapGraphs
} = require('./nodeMap');

const api = {};
module.exports = api;

/**
 * Performs JSON-LD `merged` framing.
 *
 * @param input the expanded JSON-LD to frame.
 * @param frame the expanded JSON-LD frame to use.
 * @param options the framing options.
 *
 * @return the framed output.
 */
api.frameMergedOrDefault = (input, frame, options) => {
  // create framing state
  const state = {
    options: options,
    graph: '@default',
    graphMap: {'@default': {}},
    graphStack: [],
    subjectStack: [],
    link: {},
    bnodeMap: {}
  };

  // produce a map of all graphs and name each bnode
  // FIXME: currently uses subjects from @merged graph only
  const issuer = new util.IdentifierIssuer('_:b');
  _createNodeMap(input, state.graphMap, '@default', issuer);
  if(options.merged) {
    state.graphMap['@merged'] = _mergeNodeMapGraphs(state.graphMap);
    state.graph = '@merged'
  }
  state.subjects = state.graphMap[state.graph];

  // frame the subjects
  const framed = [];
  api.frame(state, Object.keys(state.subjects).sort(), frame, framed);

  // If pruning blank nodes, find those to prune
  if(options.pruneBlankNodeIdentifiers) {
    // remove all blank nodes appearing only once, done in compaction
    options.bnodesToClear = Object.keys(state.bnodeMap).filter(id => state.bnodeMap[id].length === 1);
  }

  return framed;
};

/**
 * Frames subjects according to the given frame.
 *
 * @param state the current framing state.
 * @param subjects the subjects to filter.
 * @param frame the frame.
 * @param parent the parent subject or top-level array.
 * @param property the parent property, initialized to null.
 */
api.frame = (state, subjects, frame, parent, property = null) => {
  // validate the frame
  _validateFrame(frame);
  frame = frame[0];

  // get flags for current frame
  const options = state.options;
  const flags = {
    embed: _getFrameFlag(frame, options, 'embed'),
    explicit: _getFrameFlag(frame, options, 'explicit'),
    requireAll: _getFrameFlag(frame, options, 'requireAll')
  };

  // filter out subjects that match the frame
  const matches = _filterSubjects(state, subjects, frame, flags);

  // add matches to output
  const ids = Object.keys(matches).sort();
  for(const id of ids) {
    const subject = matches[id];

    if(flags.embed === '@link' && id in state.link) {
      // TODO: may want to also match an existing linked subject against
      // the current frame ... so different frames could produce different
      // subjects that are only shared in-memory when the frames are the same

      // add existing linked subject
      _addFrameOutput(parent, property, state.link[id]);
      continue;
    }

    /* Note: In order to treat each top-level match as a compartmentalized
    result, clear the unique embedded subjects map when the property is null,
    which only occurs at the top-level. */
    if(property === null) {
      state.uniqueEmbeds = {[state.graph]: {}};
    } else {
      state.uniqueEmbeds[state.graph] = state.uniqueEmbeds[state.graph] || {}
    }

    // start output for subject
    const output = {};
    output['@id'] = id;
    if(id.indexOf('_:') === 0) {
      util.addValue(state.bnodeMap, id, output, {propertyIsArray: true});
    }
    state.link[id] = output;

    // if embed is @never or if a circular reference would be created by an
    // embed, the subject cannot be embedded, just add the reference;
    // note that a circular reference won't occur when the embed flag is
    // `@link` as the above check will short-circuit before reaching this point
    if(flags.embed === '@never' ||
      _createsCircularReference(subject, state.graph, state.subjectStack)) {
      _addFrameOutput(parent, property, output);
      continue;
    }

    // if only the last match should be embedded
    if(flags.embed === '@last') {
      // remove any existing embed
      if(id in state.uniqueEmbeds[state.graph]) {
        _removeEmbed(state, id);
      }
      state.uniqueEmbeds[state.graph][id] = {parent: parent, property: property};
    }

    // push matching subject onto stack to enable circular embed checks
    state.subjectStack.push({subject: subject, graph: state.graph});

    // subject is also the name of a graph
    if(id in state.graphMap) {
      let recurse = false;
      let subframe = null;
      if(!('@graph' in frame)) {
        recurse = state.graph !== '@merged';
        subframe = {};
      } else {
        subframe = frame['@graph'][0];
        if(!types.isObject(subframe)) {
          subframe == {};
        }
        recurse = !(id === '@merged' || id === '@default');
      }

      if(recurse) {
        state.graphStack << state.graph;
        state.graph = id;
        // recurse into graph
        api.frame(state, Object.keys(state.graphMap[id]).sort(), [subframe], output, '@graph');
        state.graph = state.graphStack.pop;
      }
    }

    // iterate over subject properties
    for(const prop of Object.keys(subject).sort()) {
      // copy keywords to output
      if(isKeyword(prop)) {
        output[prop] = util.clone(subject[prop]);

        if(prop === '@type') {
          // count bnode values of @type
          for(const type of subject['@type']) {
            if(type.indexOf('_:') === 0) {
              util.addValue(state.bnodeMap, type, output, {propertyIsArray: true});
            }
          }
        }
        continue;
      }

      // explicit is on and property isn't in the frame, skip processing
      if(flags.explicit && !(prop in frame)) {
        continue;
      }

      // add objects
      for(let o of subject[prop]) {
        const subframe = (prop in frame ? frame[prop] : _createImplicitFrame(flags));

        // recurse into list
        if(graphTypes.isList(o)) {
          // add empty list
          const list = {'@list': []};
          _addFrameOutput(output, prop, list);

          // add list objects
          const src = o['@list'];
          for(const n in src) {
            o = src[n];
            if(graphTypes.isSubjectReference(o)) {
              const subframe = (prop in frame ?
                frame[prop][0]['@list'] : _createImplicitFrame(flags));
              // recurse into subject reference
              api.frame(state, [o['@id']], subframe, list, '@list');
            } else {
              // include other values automatically
              _addFrameOutput(list, '@list', util.clone(o));
            }
          }
          continue;
        }

        if(graphTypes.isSubjectReference(o)) {
          // recurse into subject reference
          api.frame(state, [o['@id']], subframe, output, prop);
        } else if(_valueMatch(subframe[0], o)){
          // include other values, if they match
          _addFrameOutput(output, prop, util.clone(o));
        }
      }
    }

    // handle defaults
    for(const prop of Object.keys(frame).sort()) {
      // skip keywords
      if(isKeyword(prop)) {
        continue;
      }

      // if omit default is off, then include default values for properties
      // that appear in the next frame but are not in the matching subject
      const next = frame[prop][0] || {};
      const omitDefaultOn = _getFrameFlag(next, options, 'omitDefault');
      if(!omitDefaultOn && !(prop in output)) {
        let preserve = '@null';
        if('@default' in next) {
          preserve = util.clone(next['@default']);
        }
        if(!types.isArray(preserve)) {
          preserve = [preserve];
        }
        output[prop] = [{'@preserve': preserve}];
      }
    }

    // if embed reverse values by finding nodes having this subject as a value of the associated property
    if('@reverse' in frame) {
      for(const reverseProp of Object.keys(frame['@reverse']).sort()) {
        const subframe = frame['@reverse'][reverseProp];
        for(const subject of Object.keys(state.subjects)) {
          const nodeValues = util.getValues(state.subjects[subject], reverseProp);
          if(nodeValues.some(v => v['@id'] === id)) {
            // node has property referencing this subject, recurse
            output['@reverse'] = output['@reverse'] || {};
            util.addValue(output['@reverse'], reverseProp, [], {propertyIsArray: true});
            api.frame(state, [subject], subframe, output['@reverse'][reverseProp], property);
          }
        }
      }
    }

    // add output to parent
    _addFrameOutput(parent, property, output);

    // pop matching subject from circular ref-checking stack
    state.subjectStack.pop();
  }
};

/**
 * Creates an implicit frame when recursing through subject matches. If
 * a frame doesn't have an explicit frame for a particular property, then
 * a wildcard child frame will be created that uses the same flags that the
 * parent frame used.
 *
 * @param flags the current framing flags.
 *
 * @return the implicit frame.
 */
function _createImplicitFrame(flags) {
  const frame = {};
  for(let key in flags) {
    if(flags[key] !== undefined) {
      frame['@' + key] = [flags[key]];
    }
  }
  return [frame];
}

/**
 * Checks the current subject stack to see if embedding the given subject
 * would cause a circular reference.
 *
 * @param subjectToEmbed the subject to embed.
 * @param graph the graph the subject to embed is in.
 * @param subjectStack the current stack of subjects.
 *
 * @return true if a circular reference would be created, false if not.
 */
function _createsCircularReference(subjectToEmbed, graph, subjectStack) {
  for(let i = subjectStack.length - 1; i >= 0; --i) {
    const subject = subjectStack[i];
    if(subject.graph === graph && subject.subject['@id'] === subjectToEmbed['@id']) {
      return true;
    }
  }
  return false;
}

/**
 * Gets the frame flag value for the given flag name.
 *
 * @param frame the frame.
 * @param options the framing options.
 * @param name the flag name.
 *
 * @return the flag value.
 */
function _getFrameFlag(frame, options, name) {
  let flag = '@' + name;
  let rval = (flag in frame ? frame[flag][0] : options[name]);
  if(name === 'embed') {
    // default is "@last"
    // backwards-compatibility support for "embed" maps:
    // true => "@last"
    // false => "@never"
    if(rval === true) {
      rval = '@last';
    } else if(rval === false) {
      rval = '@never';
    } else if(rval !== '@always' && rval !== '@never' && rval !== '@link') {
      rval = '@last';
    }
  }
  return rval;
}

/**
 * Validates a JSON-LD frame, throwing an exception if the frame is invalid.
 *
 * @param frame the frame to validate.
 */
function _validateFrame(frame) {
  if(!types.isArray(frame) || frame.length !== 1 || !types.isObject(frame[0])) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; a JSON-LD frame must be a single object.',
      'jsonld.SyntaxError', {frame: frame});
  }
}

/**
 * Returns a map of all of the subjects that match a parsed frame.
 *
 * @param state the current framing state.
 * @param subjects the set of subjects to filter.
 * @param frame the parsed frame.
 * @param flags the frame flags.
 *
 * @return all of the matched subjects.
 */
function _filterSubjects(state, subjects, frame, flags) {
  // filter subjects in @id order
  const rval = {};
  for(const id of subjects) {
    const subject = state.graphMap[state.graph][id];
    if(_filterSubject(state, subject, frame, flags)) {
      rval[id] = subject;
    }
  }
  return rval;
}

/**
 * Returns true if the given subject matches the given frame.
 *
 * Matches either based on explicit type inclusion where the node has any
 * type listed in the frame. If the frame has empty types defined matches
 * nodes not having a @type. If the frame has a type of {} defined matches
 * nodes having any type defined.
 *
 * Otherwise, does duck typing, where the node must have all of the
 * properties defined in the frame.
 *
 * @param state the current framing state.
 * @param subject the subject to check.
 * @param frame the frame to check.
 * @param flags the frame flags.
 *
 * @return true if the subject matches, false if not.
 */
function _filterSubject(state, subject, frame, flags) {
  // check ducktype
  let wildcard = true;
  let matchesSome = false;

  for(const key in frame) {
    let matchThis = false;
    const nodeValues = util.getValues(subject, key);
    const isEmpty = util.getValues(frame, key).length == 0;

    if(isKeyword(key)) {
      // skip non-@id and non-@type
      if(key !== '@id' && key !== '@type') {
        continue;
      }
      wildcard = false;

      // check @id for a specific @id value
      if(key === '@id') {
        // if @id is not a wildcard and is not empty, then match or not on specific value
        if(frame['@id'].length >= 0 && !types.isEmptyObject(frame['@id'][0])) {
          return frame['@id'].includes(nodeValues[0]);
        }
        matchThis = true;
        continue;
      }

      // check @type (object value means 'any' type, fall through to ducktyping)
      if('@type' in frame) {
        if(isEmpty) {
          if(nodeValues.length > 0) {
            // don't match on no @type
            return false;
          }
          matchThis = true;
        } else if(frame['@type'].length === 1 && types.isEmptyObject(frame['@type'][0])) {
          // match on wildcard @type
          matchThis = nodeValues.length > 0;
        } else {
          // match on a specific @type
          for(const type of frame['@type']) {
            if(nodeValues.some(tt => tt == type)) {
              return true;
            }
          }
          return false;
        }
      }
    }

    // Forc a copy of this frame entry so it can be manipulated
    const thisFrame = util.getValues(frame, key)[0];
    let hasDefault = false;
    if(thisFrame) {
      _validateFrame([thisFrame]);
      hasDefault = '@default' in thisFrame;
    }

    // no longer a wildcard pattern if frame has any non-keyword properties
    wildcard = false;

    // skip, but allow match if node has no value for property, and frame has a default value
    if(nodeValues.length === 0 && hasDefault) {
      continue;
    }

    // if frame value is empty, don't match if subject has any value
    if(nodeValues.length > 0 && isEmpty) {
      return false;
    }

    if(thisFrame === undefined) {
      // node does not match if values is not empty and the value of property in frame is match none.
      if(nodeValues.length > 0) {
        return false;
      }
      matchThis = true;
    } else if(types.isObject(thisFrame)) {
      // node matches if values is not empty and the value of property in frame is wildcard
      matchThis = nodeValues.length > 0;
    } else {
      if(graphTypes.isValue(thisFrame)) {
        // match on any matching value
        matchThis = nodeValues.some(nv => _valueMatch(thisFrame, nv));
      } else if(graphTypes.isSubject(thisFrame) || graphTypes.isSubjectReference(thisFrame)) {
        matchThis = nodeValues.some(nv => _nodeMatch(state, thisFrame, nv, flags));
      } else if(graphTypes.isList(thisFrame)) {
        const listValue = thisFrame['@list'][0];
        if(graphTypes.isList(nodeValues[0])) {
          const nodeListValues = nodeValues[0]['@list'];

          if(graphTypes.isValue(listValue)) {
            // match on any matching value
            matchThis = nodeListValues.some(lv => _valueMatch(listValue, lv));
          } else if(graphTypes.isSubject(listValue) || graphTypes.isSubjectReference(listValue)) {
            matchThis = nodeListValues.some(lv => _nodeMatch(state, listValue, lv, flags));
          }
        } else {
          // value must be a list to match
          matchThis = false
        }
      }
    }

    // all non-defaulted values must match if requireAll is set
    if(!matchThis && flags.requireAll) {
      return false;
    }

    matchesSome = matchesSome || matchThis;
  }

  // return true if wildcard or subject matches some properties
  return wildcard || matchesSome;
}

/**
 * Removes an existing embed.
 *
 * @param state the current framing state.
 * @param id the @id of the embed to remove.
 */
function _removeEmbed(state, id) {
  // get existing embed
  const embeds = state.uniqueEmbeds[state.graph];
  const embed = embeds[id];
  const parent = embed.parent;
  const property = embed.property;

  // create reference to replace embed
  const subject = {'@id': id};

  // remove existing embed
  if(types.isArray(parent)) {
    // replace subject with reference
    for(let i = 0; i < parent.length; ++i) {
      if(util.compareValues(parent[i], subject)) {
        parent[i] = subject;
        break;
      }
    }
  } else {
    // replace subject with reference
    const useArray = types.isArray(parent[property]);
    util.removeValue(parent, property, subject, {propertyIsArray: useArray});
    util.addValue(parent, property, subject, {propertyIsArray: useArray});
  }

  // recursively remove dependent dangling embeds
  const removeDependents = id => {
    // get embed keys as a separate array to enable deleting keys in map
    const ids = Object.keys(embeds);
    for(const next of ids) {
      if(next in embeds && types.isObject(embeds[next].parent) &&
        embeds[next].parent['@id'] === id) {
        delete embeds[next];
        removeDependents(next);
      }
    }
  };
  removeDependents(id);
}

/**
 * Adds framing output to the given parent.
 *
 * @param parent the parent to add to.
 * @param property the parent property.
 * @param output the output to add.
 */
function _addFrameOutput(parent, property, output) {
  if(types.isObject(parent)) {
    util.addValue(parent, property, output, {propertyIsArray: true});
  } else {
    parent.push(output);
  }
}

/**
 * Node matches if it is a node, and matches the pattern as a frame.
 *
 * @param state the current framing state.
 * @param pattern used to match value
 * @param value to check
 * @param flags the frame flags.
 */
function _nodeMatch(state, pattern, value, flags) {
  if(!('@id' in value)) {
    return false;
  }
  const nodeObject = state.subjects[value['@id']];
  return nodeObject && _filterSubject(state, nodeObject, pattern, flags)
}

/**
 * Value matches if it is a value and matches the value pattern
 *
 * * `pattern` is empty
 * * @values are the same, or `pattern[@value]` is a wildcard, and
 * * @types are the same or `value[@type]` is not null
 *   and `pattern[@type]` is `{}`, or `value[@type]` is null
 *   and `pattern[@type]` is null or `[]`, and
 * * @languages are the same or `value[@language]` is not null
 *   and `pattern[@language]` is `{}`, or `value[@language]` is null
 *   and `pattern[@language]` is null or `[]`.
 *
 * @param pattern used to match value
 * @param value to check
 */
function _valueMatch(pattern, value) {
  const v1 = value['@value'];
  const t1 = value['@type'];
  const l1 = value['@language'];
  const v2 = pattern['@value'] ? [].concat(pattern['@value']) : [];
  const t2 = pattern['@type'] ? [].concat(pattern['@type']) : [];
  const l2 = pattern['@language'] ? [].concat(pattern['@language']) : [];

  if(v2.length === 0 && t2.length === 0 && l2.length === 0) {
    return true;
  }
  if(!(v2.includes(v1) || types.isEmptyObject(v2[0]))) {
    return false;
  }
  if(!(!t1 && t2.length === 0 || t2.includes(t1) || t1 && types.isEmptyObject(t2[0]))) {
    return false;
  }
  if(!(!l1 && l2.length === 0 || l2.includes(l1) || l1 && types.isEmptyObject(l2[0]))) {
    return false;
  }
  return true;
}