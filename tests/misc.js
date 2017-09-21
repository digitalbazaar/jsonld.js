/**
 * Misc tests.
 */
const jsonld = require('..');
const assert = require('assert');

describe('other toRDF tests', () => {
  it('should fail for bad format', done => {
    const doc = {
      '@id': 'https://exmaple.com/',
      'https://example.com/test': 'test'
    };
    jsonld.toRDF(doc, {format: 'bogus'}, (err, output) => {
      assert(err);
      done();
    });
  });

  it.only('should handle nquads format', done => {
    const doc = {
      '@id': 'https://example.com/',
      'https://example.com/test': 'test'
    };
    jsonld.toRDF(doc, {format: 'application/nquads'}, (err, output) => {
      assert.ifError(err);
      assert.equal(
        output,
        '<https://example.com/> <https://example.com/test> "test" .\n');
      done();
    });
  });

  it('should handle default dataset format', done => {
    const doc = {
      '@id': 'https://exmaple.com/',
      'https://example.com/test': 'test'
    };
    jsonld.toRDF(doc, {}, (err, output) => {
      assert.ifError(err);
      assert.deepEqual(output, {
        "@default": [{
          "subject": {
            "type": "IRI",
            "value": "https://exmaple.com/"
          },
          "predicate": {
            "type": "IRI",
            "value": "https://example.com/test"
          },
          "object": {
            "type": "literal",
            "value": "test",
            "datatype": "http://www.w3.org/2001/XMLSchema#string"
          }
        }]
      });
      done();
    });
  });

  it('should handle no options', done => {
    const doc = {
      '@id': 'https://exmaple.com/',
      'https://example.com/test': 'test'
    };
    jsonld.toRDF(doc, (err, output) => {
      assert.ifError(err);
      assert.deepEqual(output, {
        "@default": [{
          "subject": {
            "type": "IRI",
            "value": "https://exmaple.com/"
          },
          "predicate": {
            "type": "IRI",
            "value": "https://example.com/test"
          },
          "object": {
            "type": "literal",
            "value": "test",
            "datatype": "http://www.w3.org/2001/XMLSchema#string"
          }
        }]
      });
      done();
    });
  });
});
