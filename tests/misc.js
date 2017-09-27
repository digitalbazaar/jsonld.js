/**
 * Misc tests.
 */
const jsonld = require('..');
const assert = require('assert');

// TODO: need tests for jsonld.link and jsonld.merge

describe('other toRDF tests', () => {
  const emptyRdf = {'@default': []};

  it('should process with options and callback', done => {
    jsonld.toRDF({}, {}, (err, output) => {
      assert.ifError(err);
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it('should process with no options and callback', done => {
    jsonld.toRDF({}, (err, output) => {
      assert.ifError(err);
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it('should process with options and promise', done => {
    const p = jsonld.toRDF({}, {});
    assert(p instanceof Promise);
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
    p.catch(e => {
      assert.fail();
    }).then(output => {
      assert.deepEqual(output, emptyRdf);
      done();
    });
  });

  it('should fail with no args and callback', done => {
    jsonld.toRDF((err, output) => {
      assert(err);
      done();
    });
  });

  it('should fail with no args and promise', done => {
    const p = jsonld.toRDF();
    assert(p instanceof Promise);
    p.then(output => {
      assert.fail();
    }).catch(e => {
      assert(e);
      done();
    })
  });

  it('should fail for bad format and callback', done => {
    jsonld.toRDF({}, {format: 'bogus'}, (err, output) => {
      assert(err);
      assert.equal(err.name, 'jsonld.UnknownFormat');
      done();
    });
  });

  it('should fail for bad format and promise', done => {
    const p = jsonld.toRDF({}, {format: 'bogus'});
    assert(p instanceof Promise);
    p.then(() => {
      assert.fail();
    }).catch(e => {
      assert(e);
      assert.equal(e.name, 'jsonld.UnknownFormat');
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
});
