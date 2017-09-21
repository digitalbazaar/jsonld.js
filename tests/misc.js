/**
 * Misc tests.
 */
const jsonld = require('..');
const assert = require('assert');

describe('other toRDF tests', () => {
  const emptyRdf = {'@default': []};

  it('should process with options and callback', done => {
    jsonld.toRDF({}, {}, (err, output) => {
      assert.ifError(err);
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it.skip('should process with no options and callback', done => {
    jsonld.toRDF({}, (err, output) => {
      assert.ifError(err);
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it('should process with options and promise', done => {
    const p = jsonld.toRDF({}, {});
    assert(p instanceof Promise);
    // catch and fail first, then check output
    p.catch(e => {
      assert.fail();
    }).then(output => {
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it('should process with no options and promise', done => {
    const p = jsonld.toRDF({});
    assert(p instanceof Promise);
    // catch and fail first, then check output
    p.catch(e => {
      assert.fail();
    }).then(output => {
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it.skip('should fail with no args and callback', done => {
    jsonld.toRDF((err, output) => {
      assert(err);
      done();
    });
  });

  it.skip('should fail with no args and promise', done => {
    const p = jsonld.toRDF();
    assert(p instanceof Promise);
    // fail first if error not thrown, then check error
    p.then(output => {
      assert.fail();
    }).catch(e => {
      assert(e);
      done();
    })
  });

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

  it('should handle nquads format', done => {
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

  it.skip('should handle no options', done => {
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
