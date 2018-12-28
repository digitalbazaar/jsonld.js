/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {createNodeMap} = require('./nodeMap');
const {isKeyword} = require('./context');
const graphTypes = require('./graphTypes');
const types = require('./types');
const util = require('./util');

const BLANK_NODE = 0;
const DEFAULT_GRAPH = 1;
const NAMED_NODE = 2;
const LITERAL_TYPE = 3;

const {
  // RDF,
  // RDF_LIST,
  RDF_FIRST,
  RDF_REST,
  RDF_NIL,
  RDF_TYPE,
  // RDF_PLAIN_LITERAL,
  // RDF_XML_LITERAL,
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
      graphTerm = {termType: DEFAULT_GRAPH, value: ''};
    } else if(_isAbsoluteIri(graphName)) {
      if(graphName.startsWith('_:')) {
        graphTerm = {termType: BLANK_NODE};
      } else {
        graphTerm = {termType: NAMED_NODE};
      }
      graphTerm.value = graphName;
    } else {
      // skip relative IRIs (not valid RDF)
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
  for(let i = 0; i < ids.length; ++i) {
    const id = ids[i];
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
        const subject = {
          termType: id.startsWith('_:') ? BLANK_NODE : NAMED_NODE,
          value: id
        };

        // skip relative IRI subjects (not valid RDF)
        if(!_isAbsoluteIri(id)) {
          continue;
        }

        // RDF predicate
        const predicate = {
          termType: property.startsWith('_:') ? BLANK_NODE : NAMED_NODE,
          value: property
        };

        // skip relative IRI predicates (not valid RDF)
        if(!_isAbsoluteIri(property)) {
          continue;
        }

        // skip blank node predicates unless producing generalized RDF
        if(predicate.termType === BLANK_NODE &&
          !options.produceGeneralizedRdf) {
          continue;
        }

        // convert @list to triples
        if(graphTypes.isList(item)) {
          _listToRDF(
            item['@list'], issuer, subject, predicate, dataset, graphTerm);
        } else {
          // convert value or node object to triple
          const object = _objectToRDF(item);
          // skip null objects (they are relative IRIs)
          if(object) {
            dataset.push({
              subject: subject,
              predicate: predicate,
              object: object,
              graph: graphTerm
            });
          }
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
 * @param subject the subject for the head of the list.
 * @param predicate the predicate for the head of the list.
 * @param dataset the array of quads to append to.
 * @param graphTerm the graph term for each quad.
 */
function _listToRDF(list, issuer, subject, predicate, dataset, graphTerm) {
  const first = {termType: NAMED_NODE, value: RDF_FIRST};
  const rest = {termType: NAMED_NODE, value: RDF_REST};
  const nil = {termType: NAMED_NODE, value: RDF_NIL};

  for(const item of list) {
    const blankNode = {termType: BLANK_NODE, value: issuer.getId()};
    dataset.push({
      subject: subject,
      predicate: predicate,
      object: blankNode,
      graph: graphTerm
    });

    subject = blankNode;
    predicate = first;
    const object = _objectToRDF(item);

    // skip null objects (they are relative IRIs)
    if(object) {
      dataset.push({
        subject: subject,
        predicate: predicate,
        object: object,
        graph: graphTerm
      });
    }

    predicate = rest;
  }

  dataset.push({
    subject: subject,
    predicate: predicate,
    object: nil,
    graph: graphTerm
  });
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
    object.termType = LITERAL_TYPE;
    object.value = undefined;
    object.datatype = {
      termType: NAMED_NODE
    };
    let value = item['@value'];
    const datatype = item['@type'] || null;

    // convert to XSD datatypes as appropriate
    if(types.isBoolean(value)) {
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
    } else if('@language' in item) {
      object.value = value;
      object.datatype.value = datatype || RDF_LANGSTRING;
      object.language = item['@language'];
    } else {
      object.value = value;
      object.datatype.value = datatype || XSD_STRING;
    }
  } else {
    // convert string/node object to RDF
    const id = types.isObject(item) ? item['@id'] : item;
    object.termType = id.startsWith('_:') ? BLANK_NODE : NAMED_NODE;
    object.value = id;
  }

  // skip relative IRIs, not valid RDF
  if(object.termType === NAMED_NODE && !_isAbsoluteIri(object.value)) {
    return null;
  }

  return object;
}
