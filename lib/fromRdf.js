/*
 * Copyright (c) 2017-2023 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const JsonLdError = require('./JsonLdError');
const graphTypes = require('./graphTypes');
const types = require('./types');

const {
  REGEX_BCP47,
  addValue: _addValue
} = require('./util');

const {
  handleEvent: _handleEvent
} = require('./events');

// constants
const {
  // RDF,
  RDF_LIST,
  RDF_FIRST,
  RDF_REST,
  RDF_NIL,
  RDF_TYPE,
  // RDF_PLAIN_LITERAL,
  // RDF_XML_LITERAL,
  RDF_JSON_LITERAL,
  // RDF_OBJECT,
  // RDF_LANGSTRING,

  // XSD,
  XSD_BOOLEAN,
  XSD_DOUBLE,
  XSD_INTEGER,
  XSD_STRING,
} = require('./constants');

const api = {};
module.exports = api;

/**
 * Converts an RDF dataset to JSON-LD.
 *
 * @param dataset the RDF dataset.
 * @param options the RDF serialization options.
 *
 * @return a Promise that resolves to the JSON-LD output.
 */
api.fromRDF = async (
  dataset,
  options
) => {
  const {
    useRdfType = false,
    useNativeTypes = false,
    rdfDirection = null
  } = options;
  // FIXME: use Maps?
  const defaultGraph = {};
  const graphMap = {'@default': defaultGraph};
  const referencedOnce = {};
  if(rdfDirection) {
    if(rdfDirection === 'compound-literal') {
      throw new JsonLdError(
        'Unsupported rdfDirection value.',
        'jsonld.InvalidRdfDirection',
        {value: rdfDirection});
    } else if(rdfDirection !== 'i18n-datatype') {
      throw new JsonLdError(
        'Unknown rdfDirection value.',
        'jsonld.InvalidRdfDirection',
        {value: rdfDirection});
    }
  }

  for(const quad of dataset) {
    // TODO: change 'name' to 'graph'
    const name = (quad.graph.termType === 'DefaultGraph') ?
      '@default' : quad.graph.value;
    if(!(name in graphMap)) {
      graphMap[name] = {};
    }
    if(name !== '@default' && !(name in defaultGraph)) {
      defaultGraph[name] = {'@id': name};
    }

    const nodeMap = graphMap[name];

    // get subject, predicate, object
    const s = _nodeId(quad.subject);
    const p = quad.predicate.value;
    const o = quad.object;

    if(!(s in nodeMap)) {
      nodeMap[s] = {'@id': s};
    }
    const node = nodeMap[s];

    const objectNodeId = _nodeId(o);
    const objectIsNode = !!objectNodeId;
    if(objectIsNode && !(objectNodeId in nodeMap)) {
      nodeMap[objectNodeId] = {'@id': objectNodeId};
    }

    if(p === RDF_TYPE && !useRdfType && objectIsNode) {
      _addValue(node, '@type', objectNodeId, {propertyIsArray: true});
      continue;
    }

    const value = _RDFToObject(o, useNativeTypes, rdfDirection, options);
    _addValue(node, p, value, {propertyIsArray: true});

    // object may be an RDF list/partial list node but we can't know easily
    // until all triples are read
    if(objectIsNode) {
      if(objectNodeId === RDF_NIL) {
        // track rdf:nil uniquely per graph
        const object = nodeMap[objectNodeId];
        if(!('usages' in object)) {
          object.usages = [];
        }
        object.usages.push({
          node,
          property: p,
          value
        });
      } else if(objectNodeId in referencedOnce) {
        // object referenced more than once
        referencedOnce[objectNodeId] = false;
      } else {
        // keep track of single reference
        referencedOnce[objectNodeId] = {
          node,
          property: p,
          value
        };
      }
    }
  }

  /*
  for(let name in dataset) {
    const graph = dataset[name];
    if(!(name in graphMap)) {
      graphMap[name] = {};
    }
    if(name !== '@default' && !(name in defaultGraph)) {
      defaultGraph[name] = {'@id': name};
    }
    const nodeMap = graphMap[name];
    for(let ti = 0; ti < graph.length; ++ti) {
      const triple = graph[ti];

      // get subject, predicate, object
      const s = triple.subject.value;
      const p = triple.predicate.value;
      const o = triple.object;

      if(!(s in nodeMap)) {
        nodeMap[s] = {'@id': s};
      }
      const node = nodeMap[s];

      const objectIsId = (o.type === 'IRI' || o.type === 'blank node');
      if(objectIsId && !(o.value in nodeMap)) {
        nodeMap[o.value] = {'@id': o.value};
      }

      if(p === RDF_TYPE && !useRdfType && objectIsId) {
        _addValue(node, '@type', o.value, {propertyIsArray: true});
        continue;
      }

      const value = _RDFToObject(o, useNativeTypes);
      _addValue(node, p, value, {propertyIsArray: true});

      // object may be an RDF list/partial list node but we can't know easily
      // until all triples are read
      if(objectIsId) {
        if(o.value === RDF_NIL) {
          // track rdf:nil uniquely per graph
          const object = nodeMap[o.value];
          if(!('usages' in object)) {
            object.usages = [];
          }
          object.usages.push({
            node: node,
            property: p,
            value: value
          });
        } else if(o.value in referencedOnce) {
          // object referenced more than once
          referencedOnce[o.value] = false;
        } else {
          // keep track of single reference
          referencedOnce[o.value] = {
            node: node,
            property: p,
            value: value
          };
        }
      }
    }
  }*/

  // convert linked lists to @list arrays
  for(const name in graphMap) {
    const graphObject = graphMap[name];

    // no @lists to be converted, continue
    if(!(RDF_NIL in graphObject)) {
      continue;
    }

    // iterate backwards through each RDF list
    const nil = graphObject[RDF_NIL];
    if(!nil.usages) {
      continue;
    }
    for(let usage of nil.usages) {
      let node = usage.node;
      let property = usage.property;
      let head = usage.value;
      const list = [];
      const listNodes = [];

      // ensure node is a well-formed list node; it must:
      // 1. Be referenced only once.
      // 2. Have an array for rdf:first that has 1 item.
      // 3. Have an array for rdf:rest that has 1 item.
      // 4. Have no keys other than: @id, rdf:first, rdf:rest, and,
      //   optionally, @type where the value is rdf:List.
      let nodeKeyCount = Object.keys(node).length;
      while(property === RDF_REST &&
        types.isObject(referencedOnce[node['@id']]) &&
        types.isArray(node[RDF_FIRST]) && node[RDF_FIRST].length === 1 &&
        types.isArray(node[RDF_REST]) && node[RDF_REST].length === 1 &&
        (nodeKeyCount === 3 ||
          (nodeKeyCount === 4 && types.isArray(node['@type']) &&
          node['@type'].length === 1 && node['@type'][0] === RDF_LIST))) {
        list.push(node[RDF_FIRST][0]);
        listNodes.push(node['@id']);

        // get next node, moving backwards through list
        usage = referencedOnce[node['@id']];
        node = usage.node;
        property = usage.property;
        head = usage.value;
        nodeKeyCount = Object.keys(node).length;

        // if node is not a blank node, then list head found
        if(!graphTypes.isBlankNode(node)) {
          break;
        }
      }

      // transform list into @list object
      delete head['@id'];
      head['@list'] = list.reverse();
      for(const listNode of listNodes) {
        delete graphObject[listNode];
      }
    }

    delete nil.usages;
  }

  const result = [];
  const subjects = Object.keys(defaultGraph).sort();
  for(const subject of subjects) {
    const node = defaultGraph[subject];
    if(subject in graphMap) {
      const graph = node['@graph'] = [];
      const graphObject = graphMap[subject];
      const graphSubjects = Object.keys(graphObject).sort();
      for(const graphSubject of graphSubjects) {
        const node = graphObject[graphSubject];
        // only add full subjects to top-level
        if(!graphTypes.isSubjectReference(node)) {
          graph.push(node);
        }
      }
    }
    // only add full subjects to top-level
    if(!graphTypes.isSubjectReference(node)) {
      result.push(node);
    }
  }

  return result;
};

/**
 * Converts an RDF triple object to a JSON-LD object.
 *
 * @param o the RDF triple object to convert.
 * @param useNativeTypes true to output native types, false not to.
 * @param rdfDirection text direction mode [null, i18n-datatype]
 * @param options top level API options
 *
 * @return the JSON-LD object.
 */
function _RDFToObject(o, useNativeTypes, rdfDirection, options) {
  // convert NamedNode/BlankNode object to JSON-LD
  const nodeId = _nodeId(o);
  if(nodeId) {
    return {'@id': nodeId};
  }

  // convert literal to JSON-LD
  const rval = {'@value': o.value};

  // add language
  if(o.language) {
    if(!o.language.match(REGEX_BCP47)) {
      if(options.eventHandler) {
        _handleEvent({
          event: {
            type: ['JsonLdEvent'],
            code: 'invalid @language value',
            level: 'warning',
            message: '@language value must be valid BCP47.',
            details: {
              language: o.language
            }
          },
          options
        });
      }
    }
    rval['@language'] = o.language;
  } else {
    let type = o.datatype.value;
    if(!type) {
      type = XSD_STRING;
    }
    if(type === RDF_JSON_LITERAL) {
      type = '@json';
      try {
        rval['@value'] = JSON.parse(rval['@value']);
      } catch(e) {
        throw new JsonLdError(
          'JSON literal could not be parsed.',
          'jsonld.InvalidJsonLiteral',
          {code: 'invalid JSON literal', value: rval['@value'], cause: e});
      }
    }
    // use native types for certain xsd types
    if(useNativeTypes) {
      if(type === XSD_BOOLEAN) {
        if(rval['@value'] === 'true' || rval['@value'] === '1') {
          rval['@value'] = true;
        } else if(rval['@value'] === 'false' || rval['@value'] === '0') {
          rval['@value'] = false;
        } else {
          rval['@type'] = type;
        }
      } else if(type === XSD_INTEGER) {
        if(types.isNumeric(rval['@value'])) {
          const i = parseInt(rval['@value'], 10);
          if(i.toFixed(0) === rval['@value']) {
            rval['@value'] = i;
          }
        } else {
          rval['@type'] = type;
        }
      } else if(type === XSD_DOUBLE) {
        if(types.isNumeric(rval['@value'])) {
          rval['@value'] = parseFloat(rval['@value']);
        } else {
          rval['@type'] = type;
        }
      } else {
        rval['@type'] = type;
      }
    } else if(rdfDirection === 'i18n-datatype' &&
      type.startsWith('https://www.w3.org/ns/i18n#')) {
      const [, language, direction] = type.split(/[#_]/);
      if(language.length > 0) {
        rval['@language'] = language;
        if(!language.match(REGEX_BCP47)) {
          if(options.eventHandler) {
            _handleEvent({
              event: {
                type: ['JsonLdEvent'],
                code: 'invalid @language value',
                level: 'warning',
                message: '@language value must be valid BCP47.',
                details: {
                  language
                }
              },
              options
            });
          }
        }
      }
      rval['@direction'] = direction;
    } else if(type !== XSD_STRING) {
      rval['@type'] = type;
    }
  }

  return rval;
}

/**
 * Return id for a term. Handles BlankNodes and NamedNodes. Adds a '_:' prefix
 * for BlanksNodes.
 *
 * @param term a term object.
 *
 * @return the Node term id or null.
 */
function _nodeId(term) {
  if(term.termType === 'NamedNode') {
    return term.value;
  } else if(term.termType === 'BlankNode') {
    return '_:' + term.value;
  }
  return null;
}
