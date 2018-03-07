/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
/* global Node, XMLSerializer */
'use strict';

const {
  RDF_LANGSTRING,
  RDF_PLAIN_LITERAL,
  RDF_OBJECT,
  RDF_XML_LITERAL,
  XSD_STRING,
} = require('./constants');

let _Node;
if(typeof Node !== 'undefined') {
  _Node = Node;
} else {
  _Node = {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  };
}

module.exports = class Rdfa {
  /**
   * Parses the RDF dataset found via the data object from the RDFa API.
   *
   * @param data the RDFa API data object.
   *
   * @return the RDF dataset.
   */
  parse(data) {
    const dataset = {};
    dataset['@default'] = [];

    const subjects = data.getSubjects();
    for(let si = 0; si < subjects.length; ++si) {
      const subject = subjects[si];
      if(subject === null) {
        continue;
      }

      // get all related triples
      const triples = data.getSubjectTriples(subject);
      if(triples === null) {
        continue;
      }
      const predicates = triples.predicates;
      for(const predicate in predicates) {
        // iterate over objects
        const objects = predicates[predicate].objects;
        for(let oi = 0; oi < objects.length; ++oi) {
          const object = objects[oi];

          // create RDF triple
          const triple = {};

          // add subject
          if(subject.indexOf('_:') === 0) {
            triple.subject = {type: 'blank node', value: subject};
          } else {
            triple.subject = {type: 'IRI', value: subject};
          }

          // add predicate
          if(predicate.indexOf('_:') === 0) {
            triple.predicate = {type: 'blank node', value: predicate};
          } else {
            triple.predicate = {type: 'IRI', value: predicate};
          }

          // serialize XML literal
          let value = object.value;
          if(object.type === RDF_XML_LITERAL) {
            // initialize XMLSerializer
            const XMLSerializer = getXMLSerializerClass();
            const serializer = new XMLSerializer();
            value = '';
            for(let x = 0; x < object.value.length; x++) {
              if(object.value[x].nodeType === _Node.ELEMENT_NODE) {
                value += serializer.serializeToString(object.value[x]);
              } else if(object.value[x].nodeType === _Node.TEXT_NODE) {
                value += object.value[x].nodeValue;
              }
            }
          }

          // add object
          triple.object = {};

          // object is an IRI
          if(object.type === RDF_OBJECT) {
            if(object.value.indexOf('_:') === 0) {
              triple.object.type = 'blank node';
            } else {
              triple.object.type = 'IRI';
            }
          } else {
            // object is a literal
            triple.object.type = 'literal';
            if(object.type === RDF_PLAIN_LITERAL) {
              if(object.language) {
                triple.object.datatype = RDF_LANGSTRING;
                triple.object.language = object.language;
              } else {
                triple.object.datatype = XSD_STRING;
              }
            } else {
              triple.object.datatype = object.type;
            }
          }
          triple.object.value = value;

          // add triple to dataset in default graph
          dataset['@default'].push(triple);
        }
      }
    }

    return dataset;
  }
};

function getXMLSerializerClass() {
  if(typeof XMLSerializer === 'undefined') {
    return require('xmldom').XMLSerializer;
  }
  return XMLSerializer;
}
