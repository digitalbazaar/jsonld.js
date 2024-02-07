/*
 * Copyright (c) 2017-2023 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {createNodeMap} = require('./nodeMap');
const {isKeyword} = require('./context');
const graphTypes = require('./graphTypes');
const jsonCanonicalize = require('canonicalize');
const JsonLdError = require('./JsonLdError');
const types = require('./types');
const util = require('./util');

const {
  handleEvent: _handleEvent
} = require('./events');

const {
  // RDF,
  // RDF_LIST,
  RDF_FIRST,
  RDF_REST,
  RDF_NIL,
  RDF_TYPE,
  // RDF_PLAIN_LITERAL,
  // RDF_XML_LITERAL,
  RDF_JSON_LITERAL,
  // RDF_OBJECT,
  RDF_LANGSTRING,

  // XSD,
  XSD_BOOLEAN,
  XSD_DOUBLE,
  XSD_INTEGER,
  XSD_STRING,
} = require('./constants');

const {
  isAbsolute: _isAbsoluteIri
} = require('./url');

const api = {};
module.exports = api;

/**
 * Outputs an RDF dataset for the expanded JSON-LD input.
 *
 * @param input the expanded JSON-LD input.
 * @param options the RDF serialization options.
 *
 * @return the RDF dataset.
 */
api.toRDF = (input, options) => {
  // create node map for default graph (and any named graphs)
  const issuer = new util.IdentifierIssuer('_:b');
  const nodeMap = {'@default': {}};
  createNodeMap(input, nodeMap, '@default', issuer);

  const dataset = [];
  const graphNames = Object.keys(nodeMap).sort();
  for(const graphName of graphNames) {
    let graphTerm;
    if(graphName === '@default') {
      graphTerm = {termType: 'DefaultGraph', value: ''};
    } else if(_isAbsoluteIri(graphName)) {
      graphTerm = _makeTerm(graphName);
    } else {
      // skip relative IRIs (not valid RDF)
      if(options.eventHandler) {
        _handleEvent({
          event: {
            type: ['JsonLdEvent'],
            code: 'relative graph reference',
            level: 'warning',
            message: 'Relative graph reference found.',
            details: {
              graph: graphName
            }
          },
          options
        });
      }
      continue;
    }
    _graphToRDF(dataset, nodeMap[graphName], graphTerm, issuer, options);
  }

  return dataset;
};

/**
 * Adds RDF quads for a particular graph to the given dataset.
 *
 * @param dataset the dataset to append RDF quads to.
 * @param graph the graph to create RDF quads for.
 * @param graphTerm the graph term for each quad.
 * @param issuer a IdentifierIssuer for assigning blank node names.
 * @param options the RDF serialization options.
 *
 * @return the array of RDF triples for the given graph.
 */
function _graphToRDF(dataset, graph, graphTerm, issuer, options) {
  const ids = Object.keys(graph).sort();
  for(const id of ids) {
    const node = graph[id];
    const properties = Object.keys(node).sort();
    for(let property of properties) {
      const items = node[property];
      if(property === '@type') {
        property = RDF_TYPE;
      } else if(isKeyword(property)) {
        continue;
      }

      for(const item of items) {
        // RDF subject
        const subject = _makeTerm(id);

        // skip relative IRI subjects (not valid RDF)
        if(!_isAbsoluteIri(id)) {
          if(options.eventHandler) {
            _handleEvent({
              event: {
                type: ['JsonLdEvent'],
                code: 'relative subject reference',
                level: 'warning',
                message: 'Relative subject reference found.',
                details: {
                  subject: id
                }
              },
              options
            });
          }
          continue;
        }

        // RDF predicate
        const predicate = _makeTerm(property);

        // skip relative IRI predicates (not valid RDF)
        if(!_isAbsoluteIri(property)) {
          if(options.eventHandler) {
            _handleEvent({
              event: {
                type: ['JsonLdEvent'],
                code: 'relative predicate reference',
                level: 'warning',
                message: 'Relative predicate reference found.',
                details: {
                  predicate: property
                }
              },
              options
            });
          }
          continue;
        }

        // skip blank node predicates unless producing generalized RDF
        if(predicate.termType === 'BlankNode' &&
          !options.produceGeneralizedRdf) {
          if(options.eventHandler) {
            _handleEvent({
              event: {
                type: ['JsonLdEvent'],
                code: 'blank node predicate',
                level: 'warning',
                message: 'Dropping blank node predicate.',
                details: {
                  // FIXME: add better issuer API to get reverse mapping
                  property: issuer.getOldIds()
                    .find(key => issuer.getId(key) === property)
                }
              },
              options
            });
          }
          continue;
        }

        // convert list, value or node object to triple
        const object = _objectToRDF(
          item, issuer, dataset, graphTerm, options.rdfDirection, options);
        // skip null objects (they are relative IRIs)
        if(object) {
          dataset.push({
            subject,
            predicate,
            object,
            graph: graphTerm
          });
        }
      }
    }
  }
}

/**
 * Converts a @list value into linked list of blank node RDF quads
 * (an RDF collection).
 *
 * @param list the @list value.
 * @param issuer a IdentifierIssuer for assigning blank node names.
 * @param dataset the array of quads to append to.
 * @param graphTerm the graph term for each quad.
 * @param options the RDF serialization options.
 *
 * @return the head of the list.
 */
function _listToRDF(list, issuer, dataset, graphTerm, rdfDirection, options) {
  const first = {termType: 'NamedNode', value: RDF_FIRST};
  const rest = {termType: 'NamedNode', value: RDF_REST};
  const nil = {termType: 'NamedNode', value: RDF_NIL};

  const last = list.pop();
  // Result is the head of the list
  const result = last ? {
    termType: 'BlankNode',
    value: issuer.getId().slice(2)
  } : nil;
  let subject = result;

  for(const item of list) {
    const object = _objectToRDF(
      item, issuer, dataset, graphTerm, rdfDirection, options);
    const next = {termType: 'BlankNode', value: issuer.getId().slice(2)};
    dataset.push({
      subject,
      predicate: first,
      object,
      graph: graphTerm
    });
    dataset.push({
      subject,
      predicate: rest,
      object: next,
      graph: graphTerm
    });
    subject = next;
  }

  // Tail of list
  if(last) {
    const object = _objectToRDF(
      last, issuer, dataset, graphTerm, rdfDirection, options);
    dataset.push({
      subject,
      predicate: first,
      object,
      graph: graphTerm
    });
    dataset.push({
      subject,
      predicate: rest,
      object: nil,
      graph: graphTerm
    });
  }

  return result;
}

/**
 * Converts a JSON-LD value object to an RDF literal or a JSON-LD string,
 * node object to an RDF resource, or adds a list.
 *
 * @param item the JSON-LD value or node object.
 * @param issuer a IdentifierIssuer for assigning blank node names.
 * @param dataset the dataset to append RDF quads to.
 * @param graphTerm the graph term for each quad.
 * @param options the RDF serialization options.
 *
 * @return the RDF literal or RDF resource.
 */
function _objectToRDF(
  item, issuer, dataset, graphTerm, rdfDirection, options
) {
  let object;

  // convert value object to RDF
  if(graphTypes.isValue(item)) {
    object = {
      termType: 'Literal',
      value: undefined,
      datatype: {
        termType: 'NamedNode'
      }
    };
    let value = item['@value'];
    const datatype = item['@type'] || null;

    // convert to XSD/JSON datatypes as appropriate
    if(datatype === '@json') {
      object.value = jsonCanonicalize(value);
      object.datatype.value = RDF_JSON_LITERAL;
    } else if(types.isBoolean(value)) {
      object.value = value.toString();
      object.datatype.value = datatype || XSD_BOOLEAN;
    } else if(types.isDouble(value) || datatype === XSD_DOUBLE) {
      if(!types.isDouble(value)) {
        value = parseFloat(value);
      }
      // canonical double representation
      object.value = value.toExponential(15).replace(/(\d)0*e\+?/, '$1E');
      object.datatype.value = datatype || XSD_DOUBLE;
    } else if(types.isNumber(value)) {
      object.value = value.toFixed(0);
      object.datatype.value = datatype || XSD_INTEGER;
    } else if('@direction' in item && rdfDirection === 'i18n-datatype') {
      const language = (item['@language'] || '').toLowerCase();
      const direction = item['@direction'];
      const datatype = `https://www.w3.org/ns/i18n#${language}_${direction}`;
      object.datatype.value = datatype;
      object.value = value;
    } else if('@direction' in item && rdfDirection === 'compound-literal') {
      throw new JsonLdError(
        'Unsupported rdfDirection value.',
        'jsonld.InvalidRdfDirection',
        {value: rdfDirection});
    } else if('@direction' in item && rdfDirection) {
      throw new JsonLdError(
        'Unknown rdfDirection value.',
        'jsonld.InvalidRdfDirection',
        {value: rdfDirection});
    } else if('@language' in item) {
      if('@direction' in item && !rdfDirection) {
        if(options.eventHandler) {
          // FIXME: only emit once?
          _handleEvent({
            event: {
              type: ['JsonLdEvent'],
              code: 'rdfDirection not set',
              level: 'warning',
              message: 'rdfDirection not set for @direction.',
              details: {
                object: object.value
              }
            },
            options
          });
        }
      }
      object.value = value;
      object.datatype.value = datatype || RDF_LANGSTRING;
      object.language = item['@language'];
    } else {
      if('@direction' in item && !rdfDirection) {
        if(options.eventHandler) {
          // FIXME: only emit once?
          _handleEvent({
            event: {
              type: ['JsonLdEvent'],
              code: 'rdfDirection not set',
              level: 'warning',
              message: 'rdfDirection not set for @direction.',
              details: {
                object: object.value
              }
            },
            options
          });
        }
      }
      object.value = value;
      object.datatype.value = datatype || XSD_STRING;
    }
  } else if(graphTypes.isList(item)) {
    const _list = _listToRDF(
      item['@list'], issuer, dataset, graphTerm, rdfDirection, options);
    object = {
      termType: _list.termType,
      value: _list.value
    };
  } else {
    // convert string/node object to RDF
    const id = types.isObject(item) ? item['@id'] : item;
    object = _makeTerm(id);
  }

  // skip relative IRIs, not valid RDF
  if(object.termType === 'NamedNode' && !_isAbsoluteIri(object.value)) {
    if(options.eventHandler) {
      _handleEvent({
        event: {
          type: ['JsonLdEvent'],
          code: 'relative object reference',
          level: 'warning',
          message: 'Relative object reference found.',
          details: {
            object: object.value
          }
        },
        options
      });
    }
    return null;
  }

  return object;
}

/**
 * Make a term from an id. Handles BlankNodes and NamedNodes based on a
 * possible '_:' id prefix. The prefix is removed for BlankNodes.
 *
 * @param id a term id.
 *
 * @return a term object.
 */
function _makeTerm(id) {
  if(id.startsWith('_:')) {
    return {
      termType: 'BlankNode',
      value: id.slice(2)
    };
  }
  return {
    termType: 'NamedNode',
    value: id
  };
}
