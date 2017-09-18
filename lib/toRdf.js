/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {createNodeMap} = require('./nodeMap');
const {isKeyword} = require('./context');
const graphTypes = require('./graphTypes');
const types = require('./types');
const util = require('./util');

const {
  RDF,
  RDF_LIST,
  RDF_FIRST,
  RDF_REST,
  RDF_NIL,
  RDF_TYPE,
  RDF_PLAIN_LITERAL,
  RDF_XML_LITERAL,
  RDF_OBJECT,
  RDF_LANGSTRING,

  XSD,
  XSD_BOOLEAN,
  XSD_DOUBLE,
  XSD_INTEGER,
  XSD_STRING,
} = require('./constants');

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

  const dataset = {};
  const graphNames = Object.keys(nodeMap).sort();
  for(let i = 0; i < graphNames.length; ++i) {
    const graphName = graphNames[i];
    // skip relative IRIs
    if(graphName === '@default' || graphTypes.isAbsoluteIri(graphName)) {
      dataset[graphName] = _graphToRDF(nodeMap[graphName], issuer, options);
    }
  }
  return dataset;
};

/**
 * Creates an array of RDF triples for the given graph.
 *
 * @param graph the graph to create RDF triples for.
 * @param issuer a IdentifierIssuer for assigning blank node names.
 * @param options the RDF serialization options.
 *
 * @return the array of RDF triples for the given graph.
 */
function _graphToRDF(graph, issuer, options) {
  const rval = [];

  const ids = Object.keys(graph).sort();
  for(let i = 0; i < ids.length; ++i) {
    const id = ids[i];
    const node = graph[id];
    const properties = Object.keys(node).sort();
    for(let pi = 0; pi < properties.length; ++pi) {
      let property = properties[pi];
      const items = node[property];
      if(property === '@type') {
        property = RDF_TYPE;
      } else if(isKeyword(property)) {
        continue;
      }

      for(let ii = 0; ii < items.length; ++ii) {
        const item = items[ii];

        // RDF subject
        const subject = {};
        subject.type = (id.indexOf('_:') === 0) ? 'blank node' : 'IRI';
        subject.value = id;

        // skip relative IRI subjects
        if(!graphTypes.isAbsoluteIri(id)) {
          continue;
        }

        // RDF predicate
        const predicate = {};
        predicate.type = (property.indexOf('_:') === 0) ? 'blank node' : 'IRI';
        predicate.value = property;

        // skip relative IRI predicates
        if(!graphTypes.isAbsoluteIri(property)) {
          continue;
        }

        // skip blank node predicates unless producing generalized RDF
        if(predicate.type === 'blank node' && !options.produceGeneralizedRdf) {
          continue;
        }

        // convert @list to triples
        if(graphTypes.isList(item)) {
          _listToRDF(item['@list'], issuer, subject, predicate, rval);
        } else {
          // convert value or node object to triple
          const object = _objectToRDF(item);
          // skip null objects (they are relative IRIs)
          if(object) {
            rval.push({subject: subject, predicate: predicate, object: object});
          }
        }
      }
    }
  }

  return rval;
}

/**
 * Converts a @list value into linked list of blank node RDF triples
 * (an RDF collection).
 *
 * @param list the @list value.
 * @param issuer a IdentifierIssuer for assigning blank node names.
 * @param subject the subject for the head of the list.
 * @param predicate the predicate for the head of the list.
 * @param triples the array of triples to append to.
 */
function _listToRDF(list, issuer, subject, predicate, triples) {
  const first = {type: 'IRI', value: RDF_FIRST};
  const rest = {type: 'IRI', value: RDF_REST};
  const nil = {type: 'IRI', value: RDF_NIL};

  for(let i = 0; i < list.length; ++i) {
    const item = list[i];

    const blankNode = {type: 'blank node', value: issuer.getId()};
    triples.push({subject: subject, predicate: predicate, object: blankNode});

    subject = blankNode;
    predicate = first;
    const object = _objectToRDF(item);

    // skip null objects (they are relative IRIs)
    if(object) {
      triples.push({subject: subject, predicate: predicate, object: object});
    }

    predicate = rest;
  }

  triples.push({subject: subject, predicate: predicate, object: nil});
}

/**
 * Converts a JSON-LD value object to an RDF literal or a JSON-LD string or
 * node object to an RDF resource.
 *
 * @param item the JSON-LD value or node object.
 *
 * @return the RDF literal or RDF resource.
 */
function _objectToRDF(item) {
  const object = {};

  // convert value object to RDF
  if(graphTypes.isValue(item)) {
    object.type = 'literal';
    let value = item['@value'];
    const datatype = item['@type'] || null;

    // convert to XSD datatypes as appropriate
    if(types.isBoolean(value)) {
      object.value = value.toString();
      object.datatype = datatype || XSD_BOOLEAN;
    } else if(types.isDouble(value) || datatype === XSD_DOUBLE) {
      if(!types.isDouble(value)) {
        value = parseFloat(value);
      }
      // canonical double representation
      object.value = value.toExponential(15).replace(/(\d)0*e\+?/, '$1E');
      object.datatype = datatype || XSD_DOUBLE;
    } else if(types.isNumber(value)) {
      object.value = value.toFixed(0);
      object.datatype = datatype || XSD_INTEGER;
    } else if('@language' in item) {
      object.value = value;
      object.datatype = datatype || RDF_LANGSTRING;
      object.language = item['@language'];
    } else {
      object.value = value;
      object.datatype = datatype || XSD_STRING;
    }
  } else {
    // convert string/node object to RDF
    const id = types.isObject(item) ? item['@id'] : item;
    object.type = (id.indexOf('_:') === 0) ? 'blank node' : 'IRI';
    object.value = id;
  }

  // skip relative IRIs
  if(object.type === 'IRI' && !graphTypes.isAbsoluteIri(object.value)) {
    return null;
  }

  return object;
}
